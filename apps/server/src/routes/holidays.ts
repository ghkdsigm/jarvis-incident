import type { FastifyInstance } from "fastify";
import axios from "axios";
import { env } from "../lib/env.js";

const HOLIDAY_API_BASE = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";

export type HolidayInfo = {
  date: string; // YYYY-MM-DD 형식
  name: string; // 공휴일 명칭
  isHoliday: boolean; // 공공기관 휴일여부
  dateKind: string; // 특일정보의 분류
};

/**
 * API 키가 없을 때 사용할 기본 공휴일 목록 (한국의 주요 고정 공휴일)
 * 음력 기반 공휴일(설날, 추석 등)은 제외하고 양력 고정 공휴일만 포함
 */
function getDefaultHolidays(year: number, month?: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = [];
  
  // 1월 1일 - 신정
  if (!month || month === 1) {
    holidays.push({ date: `${year}-01-01`, name: "신정", isHoliday: true, dateKind: "01" });
  }
  
  // 3월 1일 - 삼일절
  if (!month || month === 3) {
    holidays.push({ date: `${year}-03-01`, name: "삼일절", isHoliday: true, dateKind: "01" });
  }
  
  // 5월 5일 - 어린이날
  if (!month || month === 5) {
    holidays.push({ date: `${year}-05-05`, name: "어린이날", isHoliday: true, dateKind: "01" });
  }
  
  // 6월 6일 - 현충일
  if (!month || month === 6) {
    holidays.push({ date: `${year}-06-06`, name: "현충일", isHoliday: true, dateKind: "01" });
  }
  
  // 8월 15일 - 광복절
  if (!month || month === 8) {
    holidays.push({ date: `${year}-08-15`, name: "광복절", isHoliday: true, dateKind: "01" });
  }
  
  // 10월 3일 - 개천절
  if (!month || month === 10) {
    holidays.push({ date: `${year}-10-03`, name: "개천절", isHoliday: true, dateKind: "01" });
  }
  
  // 10월 9일 - 한글날
  if (!month || month === 10) {
    holidays.push({ date: `${year}-10-09`, name: "한글날", isHoliday: true, dateKind: "01" });
  }
  
  // 12월 25일 - 크리스마스
  if (!month || month === 12) {
    holidays.push({ date: `${year}-12-25`, name: "크리스마스", isHoliday: true, dateKind: "01" });
  }
  
  return holidays;
}

/**
 * 한국 공공데이터포털 공휴일 정보 API를 호출합니다.
 * getRestDeInfo: 공휴일 조회
 */
async function fetchHolidaysFromApi(year: number, month?: number): Promise<HolidayInfo[]> {
  try {
    const url = `${HOLIDAY_API_BASE}/getRestDeInfo`;
    
    // ServiceKey 이중 인코딩 방지: axios params 사용하되 ServiceKey는 그대로 전달
    // paramsSerializer로 ServiceKey만 예외 처리
    if (!env.holidayApiKey) {
      throw new Error("Holiday API key not configured");
    }

    const params: Record<string, string> = {
      ServiceKey: env.holidayApiKey, // 이미 인코딩된 키일 수 있으므로 그대로 전달
      pageNo: "1",
      numOfRows: "100",
      solYear: String(year),
      _type: "json" // JSON 응답 요청
    };
    
    if (month !== undefined) {
      params.solMonth = String(month).padStart(2, "0");
    }

    const { data } = await axios.get(url, {
      params,
      paramsSerializer: (params) => {
        // ServiceKey는 인코딩하지 않고 그대로, 나머지는 인코딩
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (key === "ServiceKey") {
            // ServiceKey는 그대로 추가 (이미 인코딩되어 있을 수 있음)
            searchParams.append(key, value as string);
          } else {
            searchParams.append(key, String(value));
          }
        });
        return searchParams.toString();
      },
      timeout: 10000,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    // JSON 응답 파싱
    const response = data?.response;
    
    if (!response) {
      throw new Error(`Invalid API response. Top level keys: ${Object.keys(data || {}).join(", ")}`);
    }

    // header에서 resultCode 확인
    const header = response.header;
    const resultCode = header?.resultCode;
    const resultMsg = header?.resultMsg;

    // resultCode 확인 (00이 아니면 에러)
    if (resultCode && resultCode !== "00") {
      throw new Error(`API error: ${resultMsg || resultCode || "Unknown error"}`);
    }

    // body에서 items 찾기
    const body = response.body;
    if (!body || !body.items) {
      // items가 없으면 빈 배열 반환 (데이터가 없는 경우)
      return [];
    }

    // item을 배열로 변환
    const itemOrItems = body.items.item;
    const items = Array.isArray(itemOrItems) ? itemOrItems : itemOrItems ? [itemOrItems] : [];

    const holidays: HolidayInfo[] = [];

    items.forEach((item: any) => {
      const locdate = item.locdate;
      const dateName = item.dateName;
      const isHoliday = item.isHoliday === "Y";
      const dateKind = item.dateKind || "";

      if (locdate && dateName) {
        // locdate는 YYYYMMDD 형식이므로 YYYY-MM-DD로 변환
        const year = String(locdate).slice(0, 4);
        const month = String(locdate).slice(4, 6);
        const day = String(locdate).slice(6, 8);
        const date = `${year}-${month}-${day}`;

        holidays.push({
          date,
          name: dateName,
          isHoliday,
          dateKind
        });
      }
    });

    return holidays;
  } catch (err: any) {
    if (err?.response?.status === 401) {
      throw new Error("Holiday API authentication failed");
    }
    throw err;
  }
}

export async function holidayRoutes(app: FastifyInstance) {
  /**
   * 공휴일 정보를 조회합니다.
   * Query parameters:
   * - year: 연도 (필수)
   * - month: 월 (옵션, 1-12)
   */
  app.get("/holidays", { preHandler: app.authenticate }, async (req: any, reply) => {
    const yearParam = req.query?.year;
    const monthParam = req.query?.month;

    if (!yearParam) {
      return reply.code(400).send({ error: "year parameter is required" });
    }

    const year = Number(yearParam);
    const month = monthParam ? Number(monthParam) : undefined;

    if (isNaN(year) || year < 1900 || year > 2100) {
      return reply.code(400).send({ error: "Invalid year" });
    }

    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return reply.code(400).send({ error: "Invalid month" });
    }

    // API 키가 없으면 기본 공휴일 목록 반환
    if (!env.holidayApiKey) {
      app.log.warn({ year, month }, "Holiday API key not configured, using default holidays");
      const defaultHolidays = getDefaultHolidays(year, month);
      return reply.send(defaultHolidays);
    }

    try {
      const holidays = await fetchHolidaysFromApi(year, month);
      // 공공기관 휴일만 필터링
      const publicHolidays = holidays.filter((h) => h.isHoliday);
      return reply.send(publicHolidays);
    } catch (err: any) {
      app.log.error({ err, year, month }, "Holiday API request failed, falling back to default holidays");
      // API 호출 실패 시 기본 공휴일 목록 반환
      const defaultHolidays = getDefaultHolidays(year, month);
      return reply.send(defaultHolidays);
    }
  });
}

