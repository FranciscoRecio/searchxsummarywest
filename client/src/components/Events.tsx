import { useState, useEffect, useRef } from 'react';
import { Event } from '../types';

interface EventsProps {
  events: Event[];
}

const Events = ({ events }: EventsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Handle debounced search input
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 200);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [inputValue]);
  
  // Get all unique tags from events
  const allTags = Array.from(new Set(events.flatMap(event => event.tags)));
  
  // Filter events based on search term, tags, and free filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some(tag => event.tags.includes(tag));
    
    const matchesFree = 
      !showFreeOnly || event.price === 0;
    
    return matchesSearch && matchesTags && matchesFree;
  });

  // Group events by date
  const groupedEvents: Record<string, Event[]> = {};
  
  filteredEvents.forEach(event => {
    const date = new Date(event.date);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    
    groupedEvents[dateKey].push(event);
  });
  
  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  // Format date for display - "Mar 7 Friday" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Format month and day (Mar 7)
    const monthDay = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    
    // Format weekday (Friday)
    const weekday = date.toLocaleDateString('en-US', { 
      weekday: 'long'
    });
    
    return { monthDay, weekday };
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Events</h2>
        <div className="join">
          <button className="join-item btn btn-sm btn-active">Upcoming</button>
          <button className="join-item btn btn-sm">Past</button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="form-control flex-grow">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Search events..." 
              className="input input-bordered w-full" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-outline flex items-center gap-2">
              Tags
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-sm bg-base-100 rounded-box w-52">
              {/* Free Only Option */}
              <li>
                <label className="label cursor-pointer justify-start font-semibold">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-info" 
                    checked={showFreeOnly}
                    onChange={(e) => setShowFreeOnly(e.target.checked)}
                  />
                  <span className="label-text ml-2">Free Events Only</span>
                </label>
              </li>
              
              {/* Divider */}
              <li className="menu-title">
                <span>Filter by Tags</span>
              </li>
              
              {/* Tag Options */}
              {allTags.map(tag => (
                <li key={tag}>
                  <label className="label cursor-pointer justify-start">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-info" 
                      checked={selectedTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        }
                      }}
                    />
                    <span className="label-text ml-2">{tag}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Events List Grouped by Date */}
      <div className="space-y-6">
        {filteredEvents.length > 0 ? (
          sortedDates.map(dateKey => {
            const { monthDay, weekday } = formatDate(dateKey);
            return (
              <div key={dateKey}>
                {/* Date Header - Left aligned without divider lines */}
                <div className="mb-4 mt-8 first:mt-0">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-lg text-info">{monthDay}</span>
                    <span className="text-gray-500 text-base font-normal">{weekday}</span>
                  </div>
                </div>
                
                {/* Events for this date */}
                <div className="space-y-4">
                  {groupedEvents[dateKey].map(event => (
                    <div key={event.id} className="card card-side bg-base-100 shadow-sm border border-base-200">
                      <figure className="w-1/4">
                        <img src={event.thumbnailUrl} alt={event.name} className="h-full w-full object-cover" />
                      </figure>
                      <div className="card-body">
                        <h3 className="card-title">{event.name}</h3>
                        <p>{event.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.tags.map(tag => (
                            <div key={tag} className="badge badge-outline">{tag}</div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{event.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="badge badge-lg">{event.price === 0 ? 'FREE' : `$${event.price}`}</div>
                            <a 
                              href={event.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn btn-link text-info flex items-center gap-1 no-underline hover:underline"
                            >
                              Details
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-xl font-semibold">No events found</div>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Events;
