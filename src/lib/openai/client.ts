import { OpenAI } from 'openai';
import { VulnerabilityType } from '@/types';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate a fix suggestion for a vulnerability
export async function generateFixSuggestion(
  vulnerabilityType: VulnerabilityType,
  description: string,
  codeSnippet: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not found, skipping fix suggestion');
    return 'AI fix suggestions require an OpenAI API key.';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a security expert who provides concise, practical fixes for web security vulnerabilities. 
          Keep your answers under 150 words, focused only on the direct solution. 
          Format your answer as plain text without markdown. 
          Start directly with the solution, no introductions.`,
        },
        {
          role: 'user',
          content: `I found a ${vulnerabilityType} vulnerability: ${description}. 
          Here's the relevant code snippet: 
          "${codeSnippet}". 
          Provide a clear, direct fix for this specific issue.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    // Extract and process the suggestion
    const suggestion = response.choices[0]?.message.content || '';
    
    // Clean up the suggestion - remove any markdown formatting
    const cleanedSuggestion = suggestion
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers
      .replace(/^#+\s+/gm, '') // Remove heading markers
      .replace(/\n+/g, ' ') // Replace multiple newlines with a single space
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();
    
    return cleanedSuggestion;
  } catch (error) {
    console.error('Error generating fix suggestion:', error);
    return 'Could not generate a fix suggestion.';
  }
}

export default openai;
