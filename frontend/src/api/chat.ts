import client from './client';

export interface ChatRequest {
  message: string;
}

export interface ChatProperty {
  id: number;
  title: string;
  price: number;
  suburb: string;
  rooms: number;
  bathrooms: number;
  cars: number;
  image_url: string;
}

export interface ChatResponse {
  reply: string;
  properties: ChatProperty[];
}

export const chatApi = {
  sendMessage: async (message: string): Promise<ChatResponse> => {
    const response = await client.post('/chat', { message });
    return response.data;
  },
};
