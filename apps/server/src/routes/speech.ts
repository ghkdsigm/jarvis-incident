import type { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";
import FormData from "form-data";
import axios from "axios";

/**
 * 음성 인식을 위한 라우트
 * OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
 */
export async function speechRoutes(app: FastifyInstance) {
  // 음성 인식 (OpenAI Whisper API)
  app.post("/speech/transcribe", { preHandler: app.authenticate }, async (req: any, reply) => {
    if (!env.openaiApiKey) {
      return reply.code(501).send({ error: "OPENAI_NOT_CONFIGURED" });
    }

    // 직접 오디오 데이터 (base64)
    const audioData = req.body as any;
    
    if (!audioData || (!audioData.audio && !audioData.data)) {
      return reply.code(400).send({ error: "NO_AUDIO_DATA" });
    }

    try {
      // base64 디코딩
      let audioBuffer: Buffer;
      if (audioData.data) {
        audioBuffer = Buffer.from(audioData.data, "base64");
      } else if (audioData.audio) {
        audioBuffer = Buffer.from(audioData.audio, "base64");
      } else {
        return reply.code(400).send({ error: "INVALID_AUDIO_FORMAT" });
      }

      // OpenAI Whisper API는 multipart/form-data를 요구
      const formData = new FormData();
      formData.append("file", audioBuffer, {
        filename: "audio.webm",
        contentType: audioData.mimeType || "audio/webm"
      });
      formData.append("model", "whisper-1");
      formData.append("language", "ko");

      // axios를 사용하여 FormData 전송
      const response = await axios.post(
        `${env.openaiBaseUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${env.openaiApiKey}`,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const result = response.data;
      const text = String(result?.text ?? "").trim();

      return reply.send({
        text,
        language: result?.language || "ko"
      });
    } catch (err: any) {
      app.log.error({ err }, "Transcription error");
      
      // axios 에러 처리
      if (err.response) {
        const errorText = err.response.data ? JSON.stringify(err.response.data) : err.response.statusText;
        app.log.error({ status: err.response.status, error: errorText }, "Whisper API error");
        return reply.code(502).send({
          error: "TRANSCRIPTION_FAILED",
          status: err.response.status,
          details: errorText.slice(0, 500)
        });
      }
      
      return reply.code(500).send({
        error: "TRANSCRIPTION_ERROR",
        message: err.message
      });
    }
  });
}

