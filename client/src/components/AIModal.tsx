import { useState, useEffect } from 'react';
import eventData from '../event_details.json';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecommendationsReceived?: (eventIds: number[]) => void;
}

const AIModal = ({ isOpen, onClose, onRecommendationsReceived }: AIModalProps) => {
  const [step, setStep] = useState<'intro' | 'classic' | 'personality' | 'results' | 'success'>('intro');
  const [interests, setInterests] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [personalityType, setPersonalityType] = useState<'energetic' | 'cerebral' | 'hybrid' | ''>('');
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, string>>({
    recharge: '',
    excitement: '',
    technology: '',
    schedule: '',
    crowd: ''
  });
  
  // Reset all state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Reset state with a small delay to ensure the modal is fully closed first
      const resetTimer = setTimeout(() => {
        setStep('intro');
        setInterests([]);
        setAdditionalInfo('');
        setIsLoading(false);
        setPersonalityType('');
        setPersonalityAnswers({
          recharge: '',
          excitement: '',
          technology: '',
          schedule: '',
          crowd: ''
        });
      }, 300);
      
      return () => clearTimeout(resetTimer);
    }
  }, [isOpen]);

  // Use useEffect to handle the modal opening/closing
  useEffect(() => {
    const modalElement = document.getElementById('ai_modal');
    if (modalElement) {
      if (isOpen) {
        (modalElement as HTMLDialogElement).showModal();
      } else {
        (modalElement as HTMLDialogElement).close();
      }
    }
  }, [isOpen]);

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handlePersonalityChange = (question: string, answer: string) => {
    setPersonalityAnswers({
      ...personalityAnswers,
      [question]: answer
    });
  };

  // Determine personality type based on answers
  const determinePersonalityType = () => {
    const answers = Object.values(personalityAnswers);
    const aCount = answers.filter(answer => answer === 'A').length;
    const bCount = answers.filter(answer => answer === 'B').length;
    
    if (aCount >= 4) {
      return 'energetic';
    } else if (bCount >= 4) {
      return 'cerebral';
    } else {
      return 'hybrid';
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      // If coming from personality quiz, determine personality type and show results
      if (step === 'personality') {
        const type = determinePersonalityType();
        setPersonalityType(type);
        setStep('results');
      }
      
      // Get current date for filtering past events
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Create a simplified version of the event data (only upcoming events)
      const simplifiedEventData = eventData
        .filter(event => {
          const eventDateStr = event.startDate.split('T')[0];
          return eventDateStr >= currentDateStr;
        })
        .map(event => {
          const { 
            id, 
            description, 
            tags 
          } = event;
          
          return {
            id,
            description,
            tags
          };
        });
      
      // Prepare the data to send to OpenAI based on which path the user took
      let prompt = '';
      
      if (step === 'classic') {
        prompt = `
          I need help finding events that match a user's interests.
          
          User's selected interests: ${interests.join(', ')}
          User's additional information: ${additionalInfo || 'None provided'}
          
          Here are the available events:
          ${JSON.stringify(simplifiedEventData, null, 2)}
          
          Based on the user's interests and additional information, please select 9 events that would be most relevant to them.
          Return ONLY a JSON array of event IDs, like this: [1, 5, 10, 15, 20, 25, 30, 35, 40]
        `;
      } else if (step === 'personality' || step === 'results') {
        // Format personality quiz answers for the prompt
        const personalityProfile = `
          How they recharge: ${personalityAnswers.recharge === 'A' ? 'Social, enjoys crowds and meeting new people' : 'Prefers solitude or small groups'}
          What excites them: ${personalityAnswers.excitement === 'A' ? 'Live music, performances, high-energy events' : 'Deep conversations, tech demos, creative showcases'}
          Tech interest: ${personalityAnswers.technology === 'A' ? 'Casual interest in technology' : 'Enthusiastic about cutting-edge technology'}
          Planning style: ${personalityAnswers.schedule === 'A' ? 'Spontaneous, flexible' : 'Structured, planned'}
          Preferred crowd size: ${personalityAnswers.crowd === 'A' ? 'Comfortable in large, buzzing crowds' : 'Prefers smaller, focused gatherings'}
        `;
        
        prompt = `
          I need help finding events that match a user's personality profile.
          
          User's personality profile:
          ${personalityProfile}
          
          Here are the available events:
          ${JSON.stringify(simplifiedEventData, null, 2)}
          
          Based on the user's personality profile, please select 9 events that would be most relevant to them.
          Return ONLY a JSON array of event IDs, like this: [1, 5, 10, 15, 20, 25, 30, 35, 40]
        `;
      }
      
      // Make the API request to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that recommends events based on user preferences. Return only JSON arrays of event IDs.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get recommendations from OpenAI');
      }
      
      const data = await response.json();
      
      // Extract the event IDs from the response
      const content = data.choices[0].message.content;
      let recommendedEventIds: number[] = [];
      
      try {
        // Try to parse the response as JSON
        recommendedEventIds = JSON.parse(content);
      } catch (e) {
        // If parsing fails, try to extract the array using regex
        const match = content.match(/\[[\d,\s]+\]/);
        if (match) {
          recommendedEventIds = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse OpenAI response');
        }
      }
      
      // Ensure we have valid event IDs
      if (!Array.isArray(recommendedEventIds) || recommendedEventIds.length === 0) {
        throw new Error('Invalid recommendations received');
      }
      
      // Save to localStorage
      localStorage.setItem('aiRecommendedEvents', JSON.stringify(recommendedEventIds));
      
      // Call the callback if provided
      if (onRecommendationsReceived) {
        onRecommendationsReceived(recommendedEventIds);
      }
      
      // Show success step instead of alert
      setStep('success');
    } catch (error) {
      console.error('Error getting recommendations:', error);
      alert('Sorry, we encountered an error while finding events for you. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the dialog close event
  const handleDialogClose = () => {
    onClose();
  };

  // Interest options with their icons
  const interestOptions = [
    {
      name: 'Meeting new people',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      name: 'Fun activities',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      )
    },
    {
      name: 'Learning something new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      )
    },
    {
      name: 'Free food',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      )
    },
    {
      name: 'Free drinks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8" />
          <path d="M12 21v-4.5" />
          <path d="M16 7l-4-4-4 4" />
          <path d="M5 11l7 7 7-7" />
        </svg>
      )
    },
    {
      name: 'Technology',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      name: 'Film',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      )
    },
    {
      name: 'Music',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    },
    {
      name: 'Business',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    }
  ];

  // Render personality type description
  const renderPersonalityDescription = () => {
    switch (personalityType) {
      case 'energetic':
        return (
          <>
            <h3 className="font-bold text-xl mb-2 text-secondary">The Energy Seeker</h3>
            <p className="mb-4">
              You thrive at SXSW's high-energy events! You'll love music showcases (like the big acts at Auditorium Shores), 
              rooftop parties, or interactive pop-ups with huge crowds.
            </p>
          </>
        );
      case 'cerebral':
        return (
          <>
            <h3 className="font-bold text-xl mb-2 text-secondary">The Thoughtful Explorer</h3>
            <p className="mb-4">
              You lean toward the cerebral or curated side of SXSW. You'll enjoy panels with tech innovators, 
              film screenings, or workshops like "The Future of AI" at the Convention Center.
            </p>
          </>
        );
      case 'hybrid':
        return (
          <>
            <h3 className="font-bold text-xl mb-2 text-secondary">The Versatile Attendee</h3>
            <p className="mb-4">
              You're up for a hybrid experience! Consider daytime sessions like startup pitches or comedy showcases, 
              then hitting a mid-sized indie band gig at night (venues like Mohawk or Stubb's).
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <dialog id="ai_modal" className="modal" onClose={handleDialogClose}>
      <div className="modal-box bg-gradient-to-b from-amber-50/50 to-blue-50/70 border border-base-200">
        {step === 'intro' && (
          <>
            <h2 className="text-2xl font-bold mb-4">Personalized Event Recommendations</h2>
            <p className="mb-6 text-sm text-gray-500">
              Answer a few questions and we'll suggest events we think you would like based on your preferences.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                className="border border-gray-100 rounded-lg p-4 hover:border-secondary cursor-pointer transition-colors flex flex-col items-center text-center bg-white/80 shadow-sm"
                onClick={() => setStep('classic')}
              >
                <div className="p-3 rounded-full mb-3">
                  {/* Clipboard Check icon for Classic Questions */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="2" />
                    <path d="m9 14 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="font-bold mb-2">Classic Questions</h3>
                <p className="text-xs text-gray-400">Quick and simple questions about what you're looking for at SXSW.</p>
              </div>
              
              <div 
                className="border border-gray-100 rounded-lg p-4 hover:border-secondary cursor-pointer transition-colors flex flex-col items-center text-center bg-white/80 shadow-sm"
                onClick={() => setStep('personality')}
              >
                <div className="p-3 rounded-full mb-3">
                  {/* Brain icon for Personality Test */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                  </svg>
                </div>
                <h3 className="font-bold mb-2">Personality Test</h3>
                <p className="text-xs text-gray-400">A deeper analysis of your preferences based on your personality type.</p>
              </div>
            </div>
          </>
        )}

        {step === 'classic' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">I am interested in...</h2>
              <button 
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setStep('intro')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {interestOptions.map(option => (
                <div 
                  key={option.name}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors text-center flex flex-col items-center justify-center h-24 relative ${
                    interests.includes(option.name) ? 'border-secondary' : 'border-gray-200 hover:border-secondary'
                  } bg-white/80`}
                  onClick={() => handleInterestToggle(option.name)}
                >
                  <div className={`absolute top-2 right-2 rounded-full w-5 h-5 flex items-center justify-center border ${
                    interests.includes(option.name) 
                      ? 'bg-secondary text-white border-secondary' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {interests.includes(option.name) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {option.icon}
                  <span className="text-sm font-bold">{option.name}</span>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-gray-500 mb-2">
                Anything else you're looking for? (Optional)
              </label>
              <textarea 
                className="w-full border border-gray-100 rounded-lg p-3 h-24 bg-white/90"
                placeholder="Tell us more about what you're interested in..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                maxLength={500}
              ></textarea>
            </div>
            
            <div className="modal-action">
              <button 
                className={`btn btn-secondary ${isLoading ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Finding Events...' : 'Find My Events'}
              </button>
            </div>
          </>
        )}

        {step === 'personality' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Personality Quiz</h2>
              <button 
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setStep('intro')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold mb-2">How do you recharge after a long day?</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="recharge" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.recharge === 'A'}
                      onChange={() => handlePersonalityChange('recharge', 'A')}
                    />
                    <span>Mingling with a crowd or meeting new people</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="recharge" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.recharge === 'B'}
                      onChange={() => handlePersonalityChange('recharge', 'B')}
                    />
                    <span>Chilling solo or with a small, familiar crew</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold mb-2">What gets you hyped?</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="excitement" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.excitement === 'A'}
                      onChange={() => handlePersonalityChange('excitement', 'A')}
                    />
                    <span>Live music, performances, or anything loud and lively</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="excitement" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.excitement === 'B'}
                      onChange={() => handlePersonalityChange('excitement', 'B')}
                    />
                    <span>Deep conversations, tech demos, or creative showcases</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold mb-2">How do you feel about new tech or gadgets?</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="technology" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.technology === 'A'}
                      onChange={() => handlePersonalityChange('technology', 'A')}
                    />
                    <span>Cool, but I'm not obsessed—show me something fun</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="technology" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.technology === 'B'}
                      onChange={() => handlePersonalityChange('technology', 'B')}
                    />
                    <span>Love it—give me the cutting-edge stuff to geek out over</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold mb-2">What's your take on schedules?</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="schedule" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.schedule === 'A'}
                      onChange={() => handlePersonalityChange('schedule', 'A')}
                    />
                    <span>I'd rather wing it and see where the day takes me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="schedule" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.schedule === 'B'}
                      onChange={() => handlePersonalityChange('schedule', 'B')}
                    />
                    <span>I like a plan—tell me what's happening and when</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold mb-2">Pick your crowd vibe:</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="crowd" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.crowd === 'A'}
                      onChange={() => handlePersonalityChange('crowd', 'A')}
                    />
                    <span>Big, buzzing, maybe chaotic—bring it on</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="crowd" 
                      className="radio radio-secondary" 
                      checked={personalityAnswers.crowd === 'B'}
                      onChange={() => handlePersonalityChange('crowd', 'B')}
                    />
                    <span>Smaller, focused, or niche—I want to connect</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className={`btn btn-secondary ${isLoading ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={isLoading || Object.values(personalityAnswers).some(answer => answer === '')}
              >
                {isLoading ? 'Finding Events...' : 'Find My Events'}
              </button>
            </div>
          </>
        )}

        {step === 'results' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your SXSW Personality</h2>
            </div>
            
            <div className="bg-white/90 rounded-lg p-6 shadow-sm mb-6">
              {renderPersonalityDescription()}
              
              <div className="text-center mt-4">
                <div className="inline-flex items-center px-4 py-2 font-semibold text-sm bg-secondary/10 text-secondary rounded-full">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finding your perfect events...
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-secondary/20 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">Analyzing your preferences</h4>
                  <p className="text-sm text-gray-500">We're matching your personality with our event database</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-secondary/20 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">Curating your schedule</h4>
                  <p className="text-sm text-gray-500">OpenAI is helping us find the perfect events for you</p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recommendations Ready!</h2>
            </div>
            
            <div className="bg-white/90 rounded-lg p-6 shadow-sm mb-6">
              <div className="mb-4 flex justify-center">
                <div className="bg-secondary/20 p-4 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="font-bold text-xl mb-2 text-secondary">Success!</h3>
              <p className="mb-4">
                We've found events that match your preferences! Close this modal to see your personalized recommendations.
              </p>
              
              {personalityType && (
                <div className="bg-secondary/10 p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-secondary mb-2">Your SXSW Personality</h4>
                  {renderPersonalityDescription()}
                  <p className="text-sm text-gray-600 mt-2">
                    We've selected events that align with your personality profile to create your ideal SXSW experience.
                  </p>
                </div>
              )}
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-secondary"
                onClick={onClose}
              >
                View My Recommendations
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Add backdrop form to allow closing when clicking outside */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default AIModal; 