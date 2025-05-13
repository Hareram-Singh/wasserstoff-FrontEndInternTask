import React from 'react';
import parse from 'html-react-parser';

// Text component to render parsed HTML content in a styled container
const Text = ({ content }) => {
  return (
    // Container for the content with a gradient background, shadow, and hover effect
    <div className="tiptap w-full px-4 py-6 md:px-6 md:py-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-blue-200">
      {/* Render the parsed HTML content with improved typography */}
      <div className="text-gray-800 leading-relaxed text-base md:text-lg">
        {parse(content)}
      </div>
    </div>
  );
};

export default Text;