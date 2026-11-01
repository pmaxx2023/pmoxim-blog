import type { APIRoute } from 'astro';
import { MENTAL_MODELS_SYSTEM_PROMPT } from '../../data/mental-models';
import { handleChat } from '../../lib/claude';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleChat(request, MENTAL_MODELS_SYSTEM_PROMPT, 2048);
