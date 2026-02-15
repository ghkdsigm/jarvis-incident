import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

export async function calendarRoutes(app: FastifyInstance) {
  // 일정 목록 조회
  app.get("/calendar/events", { preHandler: app.authenticate }, async (req: any, reply) => {
    try {
      const userId = req.user.sub as string;

      const events = await prisma.calendarEvent.findMany({
        where: { userId },
        orderBy: { start: "asc" },
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          color: true,
          createdAt: true
        }
      });

      return events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        color: e.color,
        createdAt: e.createdAt.toISOString()
      }));
    } catch (err: any) {
      req.log.error({ err }, "Failed to fetch calendar events");
      return reply.code(500).send({
        error: "INTERNAL_ERROR",
        message: env.nodeEnv === "production" ? "Internal server error" : err.message
      });
    }
  });

  // 일정 생성
  app.post("/calendar/events", { preHandler: app.authenticate }, async (req: any, reply) => {
    try {
      const userId = req.user.sub as string;
      const { title, start, end, color } = req.body as {
        title?: string;
        start?: string;
        end?: string;
        color?: string;
      };

      if (!title || !start || !end) {
        return reply.code(400).send({ error: "title, start, and end are required" });
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.code(400).send({ error: "Invalid date format" });
      }

      if (startDate > endDate) {
        return reply.code(400).send({ error: "start date must be before or equal to end date" });
      }

      const event = await prisma.calendarEvent.create({
        data: {
          userId,
          title: title.trim(),
          start: startDate,
          end: endDate,
          color: color || "#00694D"
        },
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          color: true,
          createdAt: true
        }
      });

      return {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        color: event.color,
        createdAt: event.createdAt.toISOString()
      };
    } catch (err: any) {
      req.log.error({ err }, "Failed to create calendar event");
      return reply.code(500).send({
        error: "INTERNAL_ERROR",
        message: env.nodeEnv === "production" ? "Internal server error" : err.message
      });
    }
  });

  // 일정 수정
  app.put("/calendar/events/:id", { preHandler: app.authenticate }, async (req: any, reply) => {
    try {
      const userId = req.user.sub as string;
      const eventId = req.params.id as string;
      const { title, start, end, color } = req.body as {
        title?: string;
        start?: string;
        end?: string;
        color?: string;
      };

      // 일정 존재 및 소유권 확인
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId }
      });

      if (!existing) {
        return reply.code(404).send({ error: "Event not found" });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (start !== undefined) {
        const startDate = new Date(start);
        if (isNaN(startDate.getTime())) {
          return reply.code(400).send({ error: "Invalid start date format" });
        }
        updateData.start = startDate;
      }
      if (end !== undefined) {
        const endDate = new Date(end);
        if (isNaN(endDate.getTime())) {
          return reply.code(400).send({ error: "Invalid end date format" });
        }
        updateData.end = endDate;
      }
      if (color !== undefined) updateData.color = color;

      // 날짜 유효성 검사
      const finalStart = updateData.start ? new Date(updateData.start) : existing.start;
      const finalEnd = updateData.end ? new Date(updateData.end) : existing.end;

      if (finalStart > finalEnd) {
        return reply.code(400).send({ error: "start date must be before or equal to end date" });
      }

      const event = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: updateData,
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          color: true,
          createdAt: true
        }
      });

      return {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        color: event.color,
        createdAt: event.createdAt.toISOString()
      };
    } catch (err: any) {
      req.log.error({ err }, "Failed to update calendar event");
      return reply.code(500).send({
        error: "INTERNAL_ERROR",
        message: env.nodeEnv === "production" ? "Internal server error" : err.message
      });
    }
  });

  // 일정 삭제
  app.delete("/calendar/events/:id", { preHandler: app.authenticate }, async (req: any, reply) => {
    try {
      const userId = req.user.sub as string;
      const eventId = req.params.id as string;

      // 일정 존재 및 소유권 확인
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId }
      });

      if (!existing) {
        return reply.code(404).send({ error: "Event not found" });
      }

      await prisma.calendarEvent.delete({
        where: { id: eventId }
      });

      return { ok: true };
    } catch (err: any) {
      req.log.error({ err }, "Failed to delete calendar event");
      return reply.code(500).send({
        error: "INTERNAL_ERROR",
        message: env.nodeEnv === "production" ? "Internal server error" : err.message
      });
    }
  });
}

