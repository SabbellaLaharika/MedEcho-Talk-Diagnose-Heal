import axios from 'axios';

const DID_API_URL = 'https://api.d-id.com';
const API_KEY = process.env.DID_API_KEY;

// Mapping languages to Microsoft Neural voices supported by D-ID
const FEMALE_VOICE_MAPPING: Record<string, string> = {
  "English": "en-IN-NeerjaNeural",
  "Hindi": "hi-IN-SwaraNeural",
  "Telugu": "te-IN-ShrutiNeural",
  "Tamil": "ta-IN-PallaviNeural",
  "Bengali": "bn-IN-TanishaaNeural",
  "Marathi": "mr-IN-AarohiNeural",
  "Gujarati": "gu-IN-DhwaniNeural",
  "Kannada": "kn-IN-SapnaNeural",
  "Malayalam": "ml-IN-SobhanaNeural",
  "Punjabi": "pa-IN-KaramjitNeural"
};

const MALE_VOICE_MAPPING: Record<string, string> = {
  "English": "en-IN-PrabhatNeural",
  "Hindi": "hi-IN-MadhurNeural",
  "Telugu": "te-IN-MohanNeural",
  "Tamil": "ta-IN-ValluvarNeural",
  "Bengali": "bn-IN-BashkarNeural",
  "Marathi": "mr-IN-ManoharNeural",
  "Gujarati": "gu-IN-NiranjanNeural",
  "Kannada": "kn-IN-GaganNeural",
  "Malayalam": "ml-IN-MidhunNeural",
  "Punjabi": "pa-IN-OjasNeural"
};

export class DIDService {
  private static getHeaders() {
    const auth = Buffer.from(API_KEY || '').toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    };
  }

  static async createTalk(text: string, source_url: string, language: string, gender: string = 'female') {
    try {
      const voiceMap = gender === 'male' ? MALE_VOICE_MAPPING : FEMALE_VOICE_MAPPING;
      const voiceId = voiceMap[language] || voiceMap["English"];
      
      const response = await axios.post(`${DID_API_URL}/talks`, {
        source_url: source_url,
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: voiceId
          }
        },
        config: {
          fluent: true,
          pad_audio: 0
        }
      }, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('D-ID Create Talk Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async getTalk(talkId: string) {
    try {
      const response = await axios.get(`${DID_API_URL}/talks/${talkId}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('D-ID Get Talk Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // --- Real-Time Streaming (WebRTC) API Methods ---

  static async createStream(source_url: string) {
    try {
      const response = await axios.post(`${DID_API_URL}/talks/streams`, {
        source_url
      }, {
        headers: this.getHeaders()
      });
      return response.data; // Includes id (stream_id), session_id, offer (sdp), ice_servers
    } catch (error: any) {
      console.error('D-ID Create Stream Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async startStream(streamId: string, sessionId: string, answer: any) {
    try {
      const response = await axios.post(`${DID_API_URL}/talks/streams/${streamId}/sdp`, {
        answer,
        session_id: sessionId
      }, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('D-ID Start Stream SDP Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async submitIce(streamId: string, sessionId: string, candidate: any, sdpMid: string, sdpMLineIndex: number) {
    try {
      const response = await axios.post(`${DID_API_URL}/talks/streams/${streamId}/ice`, {
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId
      }, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('D-ID Submit ICE Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async sendText(streamId: string, sessionId: string, text: string, language: string, gender: string = 'female') {
    try {
      const voiceMap = gender === 'male' ? MALE_VOICE_MAPPING : FEMALE_VOICE_MAPPING;
      const voiceId = voiceMap[language] || voiceMap["English"];
      const response = await axios.post(`${DID_API_URL}/talks/streams/${streamId}`, {
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: voiceId
          }
        },
        config: {
          fluent: true,
          pad_audio: 0
        },
        session_id: sessionId
      }, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('D-ID Send Text Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async deleteStream(streamId: string, sessionId: string) {
    try {
      const response = await axios.delete(`${DID_API_URL}/talks/streams/${streamId}`, {
        data: { session_id: sessionId },
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('D-ID Delete Stream Error:', error.response?.data || error.message);
      throw error;
    }
  }
}
