import { useState } from "react";
import "./App.css";
import { Event } from "./types";
import Events from "./components/Events";
import sxswLogo from "./assets/sxsw-logo.png";
import eventData from './event_details.json';

function App() {
  const [events] = useState<Event[]>(eventData);

  // First 3 events for recommendations
  const recommendedEvents = events.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/60 via-amber-50/50 to-blue-50/70">
      {/* Header */}
      <header className="bg-white bg-opacity-80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto p-4 max-w-5xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <img src={sxswLogo} alt="SXSW Logo" className="h-8 w-8" />
              <h1 className="text-3xl font-bold">SXSW</h1>
            </div>
            <div className="text-sm text-gray-500">
              Austin — March 7-15, 2025
            </div>
          </div>
          <p className="mt-2 text-sm">
            SXSW (South by Southwest) is an annual festival in Austin, Texas,
            blending music, film, interactive media, and tech.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl">
        {/* Recommended Events Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedEvents.map((event) => (
              <div
                key={event.id}
                className="card bg-base-100 shadow-sm border border-base-200"
              >
                <figure>
                  <img
                    src={`/images/${event.thumbnailUrl}`}
                    alt={event.name}
                    className="h-48 w-full object-cover"
                  />
                </figure>
                <div className="card-body">
                  <h3 className="card-title">{event.name}</h3>
                  <p className="text-sm">{event.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>
                      {new Date(event.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • {event.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span className="font-medium">{event.price === 'Free' ? 'Free' : event.price}</span>
                    </div>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-link text-secondary flex items-center gap-1 no-underline hover:underline p-0"
                    >
                      Details
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Events Section with Search and Filters */}
        <Events events={events} />
      </main>

      <footer className="p-4 mt-8">
        <div className="container mx-auto text-center max-w-5xl">
          <p>© 2025 SXSW. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
