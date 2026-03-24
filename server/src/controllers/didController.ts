import { Request, Response } from 'express';
import { DIDService } from '../services/didService';

// Legacy Async Talk Generation
export const generateAvatarVideo = async (req: Request, res: Response) => {
  const { text, source_url, language } = req.body;

  if (!text || !source_url) {
    return res.status(400).json({ message: 'Missing required parameters: text and source_url' });
  }

  try {
    const talkData = await DIDService.createTalk(text, source_url, language || 'English');
    const talkId = talkData.id;

    let status = 'started';
    let videoUrl = '';
    let attempts = 0;
    const maxAttempts = 15;

    while (status !== 'done' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const talkStatus = await DIDService.getTalk(talkId);
      status = talkStatus.status;
      videoUrl = talkStatus.result_url;
      attempts++;

      if (status === 'error') throw new Error('D-ID video generation failed');
    }

    if (status === 'done' && videoUrl) res.json({ videoUrl });
    else res.status(408).json({ message: 'Video generation timed out' });
  } catch (error: any) {
    console.error('Avatar Generation Controller Error:', error);
    res.status(500).json({ message: 'Failed to generate avatar video', error: error.message });
  }
};

// WebRTC Streaming Endpoints

export const createStream = async (req: Request, res: Response) => {
  try {
    const { source_url } = req.body;
    if (!source_url) return res.status(400).json({ message: 'Missing source_url' });
    const data = await DIDService.createStream(source_url);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Create stream failed', error: error.message });
  }
};

export const startStream = async (req: Request, res: Response) => {
  try {
    const { streamId, sessionId, answer } = req.body;
    if (!streamId || !sessionId || !answer) return res.status(400).json({ message: 'Missing params' });
    const data = await DIDService.startStream(streamId, sessionId, answer);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Start stream failed', error: error.message });
  }
};

export const submitIce = async (req: Request, res: Response) => {
  try {
    const { streamId, sessionId, candidate, sdpMid, sdpMLineIndex } = req.body;
    if (!streamId || !sessionId || !candidate) return res.status(400).json({ message: 'Missing params' });
    const data = await DIDService.submitIce(streamId, sessionId, candidate, sdpMid, sdpMLineIndex);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'ICE submit failed', error: error.message });
  }
};

// Real-Time Streaming: Send text to stream
export const sendStreamText = async (req: Request, res: Response) => {
  try {
    const { streamId, sessionId, text, language, gender } = req.body;
    if (!streamId || !sessionId || !text) return res.status(400).json({ message: 'Missing params' });
    const data = await DIDService.sendText(streamId, sessionId, text, language || 'en', gender);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Send stream text failed', error: error.message });
  }
};

export const deleteStream = async (req: Request, res: Response) => {
  try {
    const { streamId, sessionId } = req.body;
    if (!streamId || !sessionId) return res.status(400).json({ message: 'Missing params' });
    const data = await DIDService.deleteStream(streamId, sessionId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Delete stream failed', error: error.message });
  }
};
