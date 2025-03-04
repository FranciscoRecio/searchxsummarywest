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
        
        // Extract date information from JSON-LD
        let eventDateTime = null;
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const jsonData = JSON.parse($(el).html());
                if (jsonData['@type'] === 'Event') {
                    eventDateTime = {
                        startDate: jsonData.startDate,
                        endDate: jsonData.endDate
                    };
                }
            } catch (e) {
                console.error('Error parsing JSON-LD:', e);
            }
        });

        // Remove script tags, style tags, and other unnecessary elements
        $('script').remove();
        $('style').remove();
        
        return {
            content: $('body').text().trim(),
            datetime: eventDateTime
        };
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
                content: `Analyze this SXSW event and output a JSON object with the following structure:

{
    "description": "Brief summary of the main event details",
    "tags": ["array", "of", "applicable", "tags", "from", "the", "list", "below"],
    "price": "Pricing and ticket information",
    "sponsors": ["Array", "of", "sponsor", "names"],
    "status": "Event status (Live, Waitlist, Sold Out, etc.)"
}

Available tags:
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
- Web3

Event Content: ${content}`
            }],
            max_tokens: 4096
        });
        
        // Parse the JSON response
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error getting summary from OpenAI:', error);
        return {
            description: '',
            tags: [],
            price: '',
            sponsors: [],
            status: ''
        };
    }
}

async function parseEventOverviews() {
    try {
        const htmlContent = await fs.readFile('SXSW · Events Calendar.html', 'utf-8');
        const $ = cheerio.load(htmlContent);

        const events = [];
        $('.content-card.hoverable').each((index, element) => {
            const $element = $(element);
            
            const url = $element.find('a.event-link').attr('href');
            const name = $element.find('h3').text().trim();
            const timeElement = $element.find('.event-time');
            const time = timeElement.text().trim();
            const location = $element.find('.attribute .text-ellipses').last().text().trim();
            const fullImageUrl = $element.find('.cover-image img').attr('src');
            const thumbnailUrl = fullImageUrl ? fullImageUrl.split('/').pop() : 'No image found';

            events.push({
                name: name || 'No name found',
                time: time || 'No time found',
                url: url || 'No URL found',
                location: location || 'No location found',
                thumbnailUrl,
                index: index + 1
            });
        });

        console.log(`Found ${events.length} events`);
        await fs.writeFile('event_overviews.json', JSON.stringify(events, null, 2));
        console.log('Events saved to event_overviews.json');

        return events;

    } catch (error) {
        console.error('Error parsing events:', error);
        return [];
    }
}

// Keeping these functions for later use
async function fetchEventDetails(events) {
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        console.log(`\nProcessing event ${i + 1} of ${events.length}`);
        console.log('Name:', event.name);
        console.log('Time:', event.time);
        console.log('URL:', event.url);

        const pageContent = await fetchWebPageContent(event.url);
        if (pageContent) {
            console.log('Getting summary from OpenAI...');
            const summary = await summarizeContent(pageContent.content);
            console.log('\nSummary:', summary);
            
            // Add a delay to avoid rate limiting
            if (i < events.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

async function fetchAndSummarizeEvents() {
    try {
        const overviews = JSON.parse(await fs.readFile('event_overviews.json', 'utf-8'));
        const detailedEvents = [];

        for (let i = 0; i < overviews.length; i++) {
            const event = overviews[i];
            console.log(`\nProcessing event ${i + 1} of ${overviews.length}: ${event.name}`);

            const pageData = await fetchWebPageContent(event.url);
            if (pageData) {
                console.log('Getting summary from OpenAI...');
                const details = await summarizeContent(pageData.content);

                detailedEvents.push({
                    id: event.index,
                    name: event.name,
                    thumbnailUrl: event.thumbnailUrl,
                    description: details.description,
                    time: event.time,
                    startDate: pageData.datetime?.startDate || '',
                    endDate: pageData.datetime?.endDate || '',
                    location: event.location,
                    tags: details.tags,
                    url: event.url,
                    price: details.price,
                    sponsors: details.sponsors,
                    status: details.status
                });

                await fs.writeFile('event_details.json', JSON.stringify(detailedEvents, null, 2));
                
                if (i < overviews.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.log('\nAll events processed and saved to event_details.json');

    } catch (error) {
        console.error('Error processing events:', error);
    }
}

// Remove test function since we don't need it anymore
// async function testSingleEventPage() { ... }

parseEventOverviews();
fetchAndSummarizeEvents();