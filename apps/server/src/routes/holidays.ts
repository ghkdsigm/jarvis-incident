import type { FastifyInstance } from "fastify";
import axios from "axios";

const HOLIDAY_API_KEY = "3961cf8f4ba38e60c90fb53a3bc524d74ad83ae4fa7ca70750c0fd86577ebb64";
const HOLIDAY_API_BASE = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";

export type HolidayInfo = {
  date: string; // YYYY-MM-DD 형식
  name: string; // 공휴일 명칭
  isHoliday: boolean; // 공공기관 휴일여부
  dateKind: string; // 특일정보의 분류
};

/**
 * 한국 공공데이터포털 공휴일 정보 API를 호출합니다.
 * getRestDeInfo: 공휴일 조회
 */
async function fetchHolidaysFromApi(year: number, month?: number): Promise<HolidayInfo[]> {
  try {
    const url = `${HOLIDAY_API_BASE}/getRestDeInfo`;
    
    // ServiceKey 이중 인코딩 방지: axios params 사용하되 ServiceKey는 그대로 전달
    // paramsSerializer로 ServiceKey만 예외 처리
    const params: Record<string, string> = {
      ServiceKey: HOLIDAY_API_KEY, // 이미 인코딩된 키일 수 있으므로 그대로 전달
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

    try {
      const holidays = await fetchHolidaysFromApi(year, month);
      // 공공기관 휴일만 필터링
      const publicHolidays = holidays.filter((h) => h.isHoliday);
      return reply.send(publicHolidays);
    } catch (err: any) {
      app.log.error({ err, year, month }, "Holiday API request failed");
      const errorMessage = err?.message || String(err);
      const errorStack = err?.stack;
      return reply.code(502).send({ 
        error: "HOLIDAY_API_FETCH_FAILED", 
        message: errorMessage,
        details: errorStack ? errorStack.split('\n').slice(0, 5).join('\n') : undefined
      });
    }
  });
}

