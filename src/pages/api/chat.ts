import type { APIRoute } from 'astro';
import { SYSTEM_PROMPT } from '../../data/knowledge';
import { handleChat } from '../../lib/claude';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleChat(request, SYSTEM_PROMPT, 1024);
