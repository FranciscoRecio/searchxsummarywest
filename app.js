import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize OpenAI with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Make sure to set this in your environment variables
});

async function fetchWebPageContent(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Remove script tags, style tags, and other unnecessary elements
        $('script').remove();
        $('style').remove();
        
        // Get the main content text
        return $('body').text().trim();
    } catch (error) {
        console.error('Error fetching webpage:', error);
        return null;
    }
}

async function summarizeContent(content) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: `Analyze this SXSW event and provide a structured summary with the following:

1. Brief Description: Summarize the main event details
2. Location: Specify venue and address
3. Pricing & Availability: Include ticket types and costs
4. Sponsors: List any mentioned sponsors
5. Important Links: Preserve any URLs mentioned in the description
6. Tags: Categorize the event using relevant tags from the following (include all that apply):
   - Food
   - Drinks
   - Technology
   - AI
   - Music
   - Film
   - Art
   - Business
   - Startup
   - Education
   - Gaming
   - Social Impact
   - Health
   - Networking
   - Keynote
   - Panel
   - Party
   - Exhibition
   - Conference
   - Workshop

Event Content: ${content}`
            }],
            max_tokens: 4096
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error getting summary from OpenAI:', error);
        return null;
    }
}

async function parseHTML() {
    try {
        const htmlContent = await fs.readFile('SXSW · Events Calendar.html', 'utf-8');
        const $ = cheerio.load(htmlContent);

        // Get just the first event URL
        const firstEventUrl = $('.content-card.hoverable').first().find('a').attr('href');
        console.log('Fetching content from:', firstEventUrl);

        // Fetch and summarize the content
        const pageContent = await fetchWebPageContent(firstEventUrl);
        if (pageContent) {
            console.log('Page content:', pageContent);
            console.log('Getting summary from OpenAI...');
            const summary = await summarizeContent(pageContent);
            console.log('\nSummary:', summary);
        }

    } catch (error) {
        console.error('Error reading file:', error);
    }
}

parseHTML();