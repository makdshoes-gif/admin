import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Inicializa el cliente utilizando la clave del entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error al conectar con Gemini:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
