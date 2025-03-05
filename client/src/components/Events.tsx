import { useState, useEffect, useRef } from 'react';
import { Event } from '../types';

interface EventsProps {
  events: Event[];
}

// Static list of all available tags
const ALL_TAGS = [
  'Food',
  'Drinks',
  'Technology',
  'AI',
  'Music',
  'Film',
  'Art',
  'Business',
  'Startup',
  'Education',
  'Gaming',
  'Social Impact',
  'Health',
  'Networking',
  'Keynote',
  'Panel',
  'Party',
  'Exhibition',
  'Conference',
  'Workshop',
  'Web3'
] as const;

const Events = ({ events }: EventsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
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
  const allTags = ALL_TAGS;
  
  // Get current date for filtering past/upcoming events
  const currentDate = new Date();
  const currentDateStr = currentDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
  
  // Filter events based on search term, tags, free filter, and past/upcoming
  const filteredEvents = events.filter(event => {
    try {
      const matchesSearch = 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.some(tag => event.tags.includes(tag));
      
      const matchesFree = 
        !showFreeOnly || event.price === 'Free';
      
      // Compare just the date parts (YYYY-MM-DD)
      const eventDateStr = event.startDate.split('T')[0];
      const isPastEvent = eventDateStr < currentDateStr;
      const matchesTimeFilter = showPastEvents ? isPastEvent : !isPastEvent;
      
      const matchesStatus = 
        selectedStatuses.length === 0 || 
        selectedStatuses.includes(event.status);
      
      return matchesSearch && matchesTags && matchesFree && matchesTimeFilter && matchesStatus;
    } catch (error) {
      console.warn(`Error filtering event: ${event.name}`, error);
      return false;
    }
  });

  // Group events by date
  const groupedEvents: Record<string, Event[]> = {};
  
  filteredEvents.forEach(event => {
    try {
      // Get YYYY-MM-DD in event's local timezone
      const dateKey = event.startDate.split('T')[0];
      
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      
      groupedEvents[dateKey].push(event);
    } catch (error) {
      console.warn(`Error processing date for event: ${event.name}`, error);
    }
  });
  
  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => {
    return showPastEvents ? b.localeCompare(a) : a.localeCompare(b);
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    // Create date from YYYY-MM-DD string at noon to avoid timezone issues
    const date = new Date(`${dateString}T12:00:00`);
    
    const monthDay = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'  // Use UTC to avoid timezone shifts
    });
    const weekday = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'UTC'  // Use UTC to avoid timezone shifts
    });
    return { monthDay, weekday };
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Events</h2>
        <div className="join">
          <button 
            className={`join-item btn btn-sm ${!showPastEvents ? 'btn-active' : ''}`}
            onClick={() => setShowPastEvents(false)}
          >
            Upcoming
          </button>
          <button 
            className={`join-item btn btn-sm ${showPastEvents ? 'btn-active' : ''}`}
            onClick={() => setShowPastEvents(true)}
          >
            Past
          </button>
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
              Filters
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-sm bg-base-100 rounded-box w-52">
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
              
              <li className="divider"></li>
              <li className="menu-title">
                <span>Status</span>
              </li>
              {['Available', 'Waitlist', 'Approval Required', 'Sold Out', 'Registration Closed', 'Invite Only', 'Limited Spots'].map(status => (
                <li key={status}>
                  <label className="label cursor-pointer justify-start">
                    <input 
                      type="checkbox"
                      className="checkbox checkbox-info" 
                      checked={selectedStatuses.includes(status)}
                      onChange={() => {
                        if (selectedStatuses.includes(status)) {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                        } else {
                          setSelectedStatuses([...selectedStatuses, status]);
                        }
                      }}
                    />
                    <span className="label-text ml-2">{status}</span>
                  </label>
                </li>
              ))}
              <li className="divider"></li>
              
              <li className="menu-title">
                <span>Filter by Tags</span>
              </li>
              
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

      {/* Events List */}
      <div className="space-y-6">
        {filteredEvents.length > 0 ? (
          sortedDates.map(dateKey => {
            const { monthDay, weekday } = formatDate(dateKey);
            return (
              <div key={dateKey}>
                <div className="mb-4 mt-8 first:mt-0">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-lg text-secondary opacity-80">{monthDay}</span>
                    <span className="text-gray-400 text-base font-normal">{weekday}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {groupedEvents[dateKey].map(event => (
                    <div key={event.id} className="card card-side bg-base-100 shadow-sm border border-base-200">
                      <figure className="aspect-square w-64 flex-shrink-0">
                        <div 
                          className="w-full h-full bg-gray-50 bg-center bg-cover bg-no-repeat"
                          style={{ 
                            backgroundImage: `url(/images/${event.thumbnailUrl})`,
                            backgroundColor: '#f9fafb'
                          }}
                        />
                      </figure>
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <h3 className="card-title pr-4">{event.name}</h3>
                          {event.status && (
                            <span className="badge badge-secondary whitespace-nowrap">{event.status}</span>
                          )}
                        </div>
                        <div className="relative">
                          <p className="text-sm line-clamp-4">{event.description}</p>
                        </div>
                        {event.sponsors.length > 0 && (
                          <div className="text-sm text-gray-500">
                            Sponsored by: {event.sponsors.join(', ')}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.tags.map(tag => (
                            <div key={tag} className="badge badge-outline">{tag}</div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{event.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
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
                              className="btn btn-link text-secondary flex items-center gap-1 no-underline hover:underline"
                            >
                              Details
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
