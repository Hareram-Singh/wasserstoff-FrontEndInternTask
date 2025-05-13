import React, { useState, useEffect } from 'react';

// UserList component to display connected users in a collaborative session
const UserList = ({ provider }) => {
  // State to store the list of connected users
  const [users, setUsers] = useState([]);

  // Effect to update the user list based on provider awareness changes
  useEffect(() => {
    if (!provider || !provider.awareness) {
      return;
    }

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      // Map awareness states to a user list with clientID, name, and color
      const userList = Array.from(states.entries())
        .map(([clientID, state]) => ({
          clientID,
          name: state.user?.name || 'Anonymous',
          color: state.user?.color || '#000000',
        }))
        // Filter out 'Anonymous' users unless they are the current client
        .filter(user => user.name !== 'Anonymous' || user.clientID === provider.awareness.clientID);
      setUsers(userList);
    };

    provider.awareness.on('change', updateUsers);
    updateUsers(); // Initial update

    // Cleanup: Remove the event listener on unmount
    return () => {
      provider.awareness.off('change', updateUsers);
    };
  }, [provider]);

  // Display a loading message if the provider or awareness is not ready
  if (!provider || !provider.awareness) {
    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
        <p className="text-gray-600 italic">Connecting to collaboration server...</p>
      </div>
    );
  }

  return (
    // Container for the user list with gradient background, shadow, and hover effect
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300">
      {/* Heading with gradient text effect */}
      <h3 className="text-lg md:text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        Connected Users
      </h3>
      {users.length === 0 ? (
        // Empty state styling for when no users are connected
        <p className="text-gray-500 italic">No users connected.</p>
      ) : (
        // List of connected users with styled entries
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.clientID} className="text-sm flex items-center gap-2">
              {/* Colored dot indicating the user */}
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }}></span>
              <span className="text-gray-800 font-medium">{user.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;