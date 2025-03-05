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
        
        // Extract date and price information from JSON-LD
        let eventData = null;
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const jsonData = JSON.parse($(el).html());
                console.log('JSON-LD data:', JSON.stringify(jsonData, null, 2)); // For testing
                
                if (jsonData['@type'] === 'Event') {
                    const price = jsonData.offers?.[0]?.price;
                    const formattedPrice = price === 0 ? 'Free' : 
                                          price ? `$${price}` : undefined;

                    const status = jsonData.eventStatus?.split('/').pop() || ''; // Gets "EventScheduled" from URL
                    const availability = jsonData.offers?.[0]?.availability?.split('/').pop() || ''; // Gets "InStock" from URL

                    eventData = {
                        startDate: jsonData.startDate,
                        endDate: jsonData.endDate,
                        price: formattedPrice,
                        priceCurrency: jsonData.offers?.[0]?.priceCurrency,
                        availability: availability,
                        eventStatus: status,
                        offerName: jsonData.offers?.[0]?.name,
                        offers: jsonData.offers // Keep full offers array for reference
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
            eventData
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
    "sponsors": ["Array", "of", "official", "event", "sponsors", "only", "(not", "participants", "or", "venues)"],
    "status": "Event status (must be one of: Available, Waitlist, Approval Required, Sold Out, Registration Closed, Invite Only, Limited Spots)"
}

For sponsors, only include organizations that are explicitly mentioned as sponsors or presenters of the event. Do not include venues, participants, or mentioned companies that aren't sponsoring.

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
        
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error getting summary from OpenAI:', error);
        return {
            description: '',
            tags: [],
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

async function fetchEventContents() {
    try {
        const overviews = JSON.parse(await fs.readFile('event_overviews.json', 'utf-8'));
        const eventContents = [];

        for (let i = 0; i < overviews.length; i++) {
            const event = overviews[i];
            console.log(`\nFetching content for event ${i + 1} of ${overviews.length}: ${event.name}`);

            const pageData = await fetchWebPageContent(event.url);
            if (pageData) {
                eventContents.push({
                    id: event.index,
                    name: event.name,
                    thumbnailUrl: event.thumbnailUrl,
                    content: pageData.content,
                    time: event.time,
                    startDate: pageData.eventData?.startDate || '',
                    endDate: pageData.eventData?.endDate || '',
                    location: event.location,
                    url: event.url,
                    jsonPrice: pageData.eventData?.price,
                    jsonStatus: pageData.eventData?.eventStatus,
                    jsonAvailability: pageData.eventData?.availability,
                    jsonOfferName: pageData.eventData?.offerName,
                    jsonOffers: pageData.eventData?.offers
                });

                await fs.writeFile('event_contents.json', JSON.stringify(eventContents, null, 2));
                
                if (i < overviews.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.log('\nAll event contents saved to event_contents.json');

    } catch (error) {
        console.error('Error fetching event contents:', error);
    }
}

// Test function for a single event
async function testSingleEventPage() {
    const url = 'https://lu.ma/hdue6sat'; // Building the Future: Charter Cities event
    const result = await fetchWebPageContent(url);
    console.log('Event data:', result.eventData);
}

async function summarizeEvents() {
    try {
        const eventContents = JSON.parse(await fs.readFile('event_contents.json', 'utf-8'));
        const detailedEvents = [];

        for (let i = 0; i < eventContents.length; i++) {
            const event = eventContents[i];
            console.log(`\nSummarizing event ${i + 1} of ${eventContents.length}: ${event.name}`);

            const details = await summarizeContent(event.content);
            detailedEvents.push({
                id: event.id,
                name: event.name,
                thumbnailUrl: event.thumbnailUrl,
                description: details.description,
                time: event.time,
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location,
                tags: details.tags,
                url: event.url,
                price: event.jsonPrice,
                sponsors: details.sponsors,
                status: details.status
            });

            await fs.writeFile('event_details.json', JSON.stringify(detailedEvents, null, 2));
            
            if (i < eventContents.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\nAll events summarized and saved to event_details.json');

    } catch (error) {
        console.error('Error summarizing events:', error);
    }
}

// Comment out what we don't need
//parseEventOverviews();
//fetchEventContents();
summarizeEvents();