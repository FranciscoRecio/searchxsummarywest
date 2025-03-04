import { useState, useEffect } from 'react';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIModal = ({ isOpen, onClose }: AIModalProps) => {
  const [step, setStep] = useState<'intro' | 'classic' | 'personality'>('intro');
  const [interests, setInterests] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  
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

  const handleSubmit = () => {
    // In a real app, this would send the data to an API
    console.log('Interests:', interests);
    console.log('Additional info:', additionalInfo);
    alert('Thank you! We will use this information to find events you might like.');
    onClose();
  };

  // Handle the dialog close event
  const handleDialogClose = () => {
    onClose();
  };

  return (
    <dialog id="ai_modal" className="modal" onClose={handleDialogClose}>
      <div className="modal-box">
        {step === 'intro' && (
          <>
            <h2 className="text-2xl font-bold mb-4">Personalized Event Recommendations</h2>
            <p className="mb-6 text-sm text-gray-500">
              Answer a few questions and we'll suggest events we think you would like based on your preferences.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                className="border rounded-lg p-4 hover:border-secondary cursor-pointer transition-colors flex flex-col items-center text-center"
                onClick={() => setStep('classic')}
              >
                <div className="p-3 rounded-full mb-3">
                  {/* Checklist icon for Classic Questions */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m8 6 4 4 4-4" />
                    <path d="M6 12h12" />
                    <path d="M8 18h8" />
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                  </svg>
                </div>
                <h3 className="font-bold mb-2">Classic Questions</h3>
                <p className="text-xs text-gray-400">Quick and simple questions about what you're looking for at SXSW.</p>
              </div>
              
              <div 
                className="border rounded-lg p-4 hover:border-secondary cursor-pointer transition-colors flex flex-col items-center text-center"
                onClick={() => setStep('personality')}
              >
                <div className="p-3 rounded-full mb-3">
                  {/* Brain icon for Personality Test */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setStep('intro')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {['Meeting new people', 'Fun activities', 'Learning something new', 'Free food', 'Free drinks'].map(interest => (
                <div 
                  key={interest}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors text-center ${
                    interests.includes(interest) ? 'bg-secondary text-white border-secondary' : 'hover:border-secondary'
                  }`}
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-gray-500 mb-2">
                Anything else you're looking for? (Optional)
              </label>
              <textarea 
                className="w-full border rounded-lg p-3 h-24"
                placeholder="Tell us more about what you're interested in..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
              ></textarea>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-secondary"
                onClick={handleSubmit}
              >
                Find My Events
              </button>
            </div>
          </>
        )}

        {step === 'personality' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Personality Test</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setStep('intro')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
            
            <p className="mb-6 text-sm text-gray-500">
              Coming soon! Our personality test is still being developed. Please try the classic questions for now.
            </p>
            
            <div className="modal-action">
              <button 
                className="btn btn-secondary"
                onClick={() => setStep('classic')}
              >
                Try Classic Questions
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