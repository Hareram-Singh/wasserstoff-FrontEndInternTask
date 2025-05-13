import React, { useState, useEffect } from 'react';

// EditLog component to display a history of edits in a collaborative session
const EditLog = ({ provider, editor }) => {
  // State to store the edit history, readiness, and errors
  const [editHistory, setEditHistory] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  // Effect to track document changes and log edit history
  useEffect(() => {
    // Validate editor availability
    if (!editor) {
      setError('Editor not initialized');
      return;
    }

    // Validate provider and its dependencies
    if (!provider || !provider.document || !provider.awareness) {
      return;
    }

    setIsReady(true);
    const ydoc = provider.document;

    const logChange = (update, origin) => {
      const content = editor.getHTML();
      const lines = content.split('</p>').filter(Boolean);

      // Get user information from awareness
      const awarenessStates = provider.awareness.getStates();
      const clientId = provider.awareness.clientID;
      const userState = awarenessStates.get(clientId);
      const userName = userState?.user?.name || 'Anonymous';
      const userColor = userState?.user?.color || '#000000';

      // Compare current content with the last entry to detect changes
      const lastEntry = editHistory.length > 0 ? editHistory[editHistory.length - 1] : null;
      const lastContent = lastEntry ? lastEntry.content : '';
      const changedLines = lines.filter((line, index) => {
        const lastLines = lastContent.split('</p>').filter(Boolean);
        return lastLines[index] !== line;
      });

      // Log new changes if there are any
      if (changedLines.length > 0) {
        const newEntry = {
          timestamp: new Date().toLocaleTimeString(),
          userName,
          userColor,
          changedLines: changedLines.map((line) => line.replace(/<\/?[^>]+(>|$)/g, '')),
          content,
        };

        // Update history, keeping only the last 10 entries
        setEditHistory((prev) => {
          const updatedHistory = [...prev, newEntry].slice(-10);
          localStorage.setItem('editHistory', JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      }
    };

    // Load saved edit history from local storage
    const savedHistory = localStorage.getItem('editHistory');
    if (savedHistory) {
      setEditHistory(JSON.parse(savedHistory));
    }

    ydoc.on('update', logChange);

    // Cleanup: Remove the event listener on unmount
    return () => {
      ydoc.off('update', logChange);
    };
  }, [provider, editor]);

  // Display error message if the editor fails to initialize
  if (error) {
    return (
      <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50 shadow-sm text-red-700">
        {error}
      </div>
    );
  }

  // Display loading message if the provider is not ready
  if (!isReady) {
    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
        <p className="text-gray-600 italic">Connecting to collaboration server...</p>
      </div>
    );
  }

  return (
    // Container for the edit history with gradient background, shadow, and hover effect
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 max-h-60 overflow-y-auto">
      {/* Heading with gradient text effect */}
      <h3 className="text-lg md:text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        Edit History
      </h3>
      {editHistory.length === 0 ? (
        // Empty state styling for when no changes are logged
        <p className="text-gray-500 italic">No changes yet.</p>
      ) : (
        // List of edit history entries with styled items
        <ul className="space-y-3">
          {editHistory.map((entry, index) => (
            <li
              key={index}
              className="text-sm bg-white bg-opacity-70 p-2 rounded-md shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">[{entry.timestamp}]</span>
                <span className="font-medium" style={{ color: entry.userColor }}>
                  {entry.userName}
                </span>
                <span className="text-gray-600">edited:</span>
              </div>
              {entry.changedLines.map((line, i) => (
                <span
                  key={i}
                  className="block pl-4 mt-1 italic text-gray-700 text-xs"
                >
                  - {line || '[Empty Line]'}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EditLog;