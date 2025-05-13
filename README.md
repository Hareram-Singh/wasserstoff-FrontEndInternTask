**Collaborative Text Editor**
**Overview**
This project is a Collaborative Text Editor built with React, Tiptap, and Yjs/WebRTC. It allows multiple users to edit a document in real-time, with features like rich text formatting (bold, italic, headings, etc.), user awareness (displaying connected users), and edit history tracking. The editor supports collaborative editing through WebRTC, with state persistence using local storage. The UI is styled with Tailwind CSS for a modern and responsive design.
Key features:

Real-time collaborative editing using Yjs and WebRTC.

Rich text editing with Tiptap (bold, italic, underline, headings, lists, links, images, etc.).

User list to show connected users with their names and colors.

Edit history to track changes made by users.

Responsive design with Tailwind CSS, including gradient backgrounds, hover effects, and styled scrollbars.

Prerequisites
Before running the project, ensure you have the following installed:
Node.js (v16 or higher recommended)

npm (v7 or higher) 

A modern web browser (e.g., Chrome, Firefox)

How to Run the Project
Follow these steps to set up and run the project locally:
Clone the Repository
Clone the project to your local machine:
bash

git clone <https://github.com/Hareram-Singh/wasserstoff-FrontEndInternTask.git>
cd <wasserstoff-FrontEndInternTask
>

Install Dependencies
Install the required npm packages:
bash

npm install


Run the Development Server
Start the development server to run the project locally:
bash

npm run dev


Open the App in Your Browser
Once the server starts, open your browser and navigate to:

http://localhost:5173

The port number (e.g., 5173) may vary depending on your setup. Check the terminal output for the exact URL.

Test Collaborative Editing  
Open the app in multiple browser tabs or devices to simulate multiple users.

Enter a username for each user (or use the default random username).

Start editing the document, and observe real-time updates across all instances.

Check the Connected Users section to see the list of users.

Check the Edit History section to see the logged changes.

Project Structure
Here’s a brief overview of the key components:
src/components/Tiptap.jsx: The main editor component, integrating Tiptap with Yjs for collaborative editing. It includes a toolbar for formatting, theme selection, and user settings.

src/components/UserList.jsx: Displays the list of connected users with their names and colors.

src/components/EditLog.jsx: Logs and displays the edit history, showing who made changes and what was changed.

src/components/Text.jsx: A component to render parsed HTML content (e.g., for displaying saved editor content).

src/index.css: Custom CSS for Tailwind and additional styles (e.g., scrollbar styling).

Dependencies
The project uses the following key libraries:
React: For building the UI.

Tiptap: For the rich text editor.

Yjs & y-webrtc: For real-time collaboration and WebRTC-based syncing.

Tailwind CSS: For styling the UI.

html-react-parser: For parsing HTML content in the Text component.

Notes for Production
Collaboration Backend: The project currently uses a public WebRTC signaling server (wss://signaling.yjs.dev) for testing. For production, consider using Tiptap’s hosted collaboration service or setting up a self-hosted signaling server for better reliability and security.

Security: If the Text component renders user-generated HTML content, sanitize the input to prevent XSS attacks (e.g., using a library like DOMPurify).

Deployment: The project can be deployed to platforms like Vercel or Netlify. Ensure the WebRTC signaling server is accessible in production.

Troubleshooting
WebRTC Connection Issues: If the app fails to connect to the collaboration server, ensure your network allows WebRTC traffic and that the signaling server (wss://signaling.yjs.dev) is reachable.

Editor Not Loading: Check the browser console for errors. Ensure all dependencies are installed correctly (npm install).

Styling Issues: Verify that Tailwind CSS is properly configured in your project (tailwind.config.js and src/index.css).

Contributing
Feel free to open issues or submit pull requests for bug fixes, improvements, or new features. Ensure you test your changes locally before submitting.
License
This project is licensed under the MIT License. See the LICENSE file for details.
Summary
Project Explanation: The README.md provides a concise overview of the project, explaining that it’s a collaborative text editor with real-time editing, user awareness, and edit history features, built with React, Tiptap, Yjs/WebRTC, and Tailwind CSS.

How to Run: Detailed steps are provided to clone the repository, install dependencies, run the development server, and test the collaborative features.

Additional Sections: Included sections for prerequisites, project structure, dependencies, production notes, troubleshooting, contributing, and licensing to make the README.md comprehensive.

