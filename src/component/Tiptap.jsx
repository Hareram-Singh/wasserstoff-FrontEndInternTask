import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Extension } from '@tiptap/core';
import * as Y from 'yjs';
import UserList from './UserList';
import EditLog from './EditLog';
import { WebrtcProvider } from 'y-webrtc';
import 'webrtc-adapter';
import {
  FaBold, FaItalic, FaStrikethrough, FaUnderline, FaCode, FaParagraph, FaHeading,
  FaListUl, FaListOl, FaQuoteRight, FaMinus, FaUndo, FaRedo, FaAlignLeft,
  FaAlignCenter, FaAlignRight, FaAlignJustify, FaLink, FaUnlink, FaImage,
} from 'react-icons/fa';

// Utility function to debounce frequent updates, e.g., saving editor state
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Custom Tiptap extension to add font size styling
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Main Tiptap component for collaborative text editing
const Tiptap = ({ onEditorContentSave }) => {
  // Initialize Yjs document and fragment for collaborative editing
  const ydoc = useMemo(() => new Y.Doc(), []);
  const fragment = useMemo(() => ydoc.getXmlFragment('prosemirror'), [ydoc]);

  // State for editor UI and collaboration features
  const [theme, setTheme] = useState('light');
  const [toolbarConfig, setToolbarConfig] = useState({
    bold: true,
    italic: true,
    underline: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false);
  const [userName, setUserName] = useState(`User-${Math.floor(Math.random() * 1000)}`);
  const [userColor] = useState(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Initialize Tiptap editor with extensions for formatting and collaboration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable local history since Yjs handles it
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      Link.configure({ openOnClick: false }),
      Image,
      Collaboration.configure({ document: ydoc, fragment }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider: provider,
              user: { name: userName, color: userColor },
            }),
          ]
        : []),
    ],
    content: '',
    onCreate({ editor }) {
      // Custom keybinding: Ctrl+A to select all text in the editor
      editor.view.dom.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'a') {
          event.preventDefault();
          editor.commands.selectAll();
        }
      });
    },
  }, [provider, userName, userColor]);

  // Set up WebRTC for real-time collaboration and manage editor state
  useEffect(() => {
    // Load saved editor state from local storage
    const savedState = localStorage.getItem('editor-state');
    if (savedState) {
      Y.applyUpdate(ydoc, new Uint8Array(JSON.parse(savedState)));
    }

    // Connect to a public signaling server for WebRTC peer-to-peer collaboration
    const signalingUrl = 'wss://signaling.yjs.dev';

    let webrtcProvider;
    let retries = 0;
    const maxRetries = 3;
    const retryInterval = 5000;

    // Initialize WebRTC provider with retry logic
    const initProvider = () => {
      webrtcProvider = new WebrtcProvider('collaborative-editor-room', ydoc, {
        signaling: [signalingUrl],
        webrtc: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            {
              urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
              username: 'webrtc',
              credential: 'webrtc',
            },
          ],
        },
      });

      // Update connection status when WebRTC connects or disconnects
      webrtcProvider.on('status', (event) => {
        const isConnectedNow = event.connected;
        setIsConnected(isConnectedNow);
        if (isConnectedNow) {
          setProvider(webrtcProvider);
          setConnectionError(null);
          clearInterval(retryTimer);
        }
      });

      // Handle WebRTC errors
      webrtcProvider.on('error', (error) => {
        setConnectionError(`WebRTC error: ${error.message}`);
      });
    };

    initProvider();

    // Retry WebRTC connection if it fails
    const retryTimer = setInterval(() => {
      if (!isConnected && retries < maxRetries) {
        retries++;
        webrtcProvider.destroy();
        initProvider();
      } else if (!isConnected) {
        setConnectionError('WebRTC connection failed after multiple attempts.');
        clearInterval(retryTimer);
      }
    }, retryInterval);

    // Timeout for WebRTC connection attempts
    const timeout = setTimeout(() => {
      if (!isConnected && retries >= maxRetries) {
        setConnectionError('WebRTC connection timed out. Ensure the signaling server is running at ' + signalingUrl);
      }
    }, 20000);

    // Save editor state to local storage on updates
    const debouncedSaveState = debounce((state) => {
      localStorage.setItem('editor-state', JSON.stringify(Array.from(state)));
    }, 1000);

    ydoc.on('update', () => {
      const state = Y.encodeStateAsUpdate(ydoc);
      debouncedSaveState(state);
    });

    // Initialize Yjs undo manager for collaborative undo/redo
    const undoManager = new Y.UndoManager(fragment);

    // Cleanup on component unmount
    return () => {
      clearInterval(retryTimer);
      clearTimeout(timeout);
      webrtcProvider.destroy();
      undoManager.destroy();
      ydoc.destroy();
    };
  }, [ydoc, fragment]);

  // Update user metadata for collaboration awareness
  useEffect(() => {
    if (provider) {
      provider.awareness.setLocalStateField('user', {
        name: userName,
        color: userColor,
      });
    }
  }, [userName, userColor, provider]);

  // Auto-save editor content on updates
  useEffect(() => {
    if (editor) {
      const debouncedSave = debounce((html) => {
        onEditorContentSave(html);
      }, 500);

      editor.on('update', () => {
        const html = editor.getHTML();
        debouncedSave(html);
      });

      return () => {
        editor.off('update');
      };
    }
  }, [editor, onEditorContentSave]);

  // Handle manual save of editor content
  const handleEditorContent = async () => {
    try {
      const html = editor.getHTML();
      await onEditorContentSave(html);
      setToast({ message: 'Content saved successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to save content.', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  if (!editor) {
    return <div className="text-center p-4">Loading editor...</div>;
  }

  // Apply theme-based styling to the editor
  const editorClass =
    theme === 'dark'
      ? 'bg-gray-800 text-white border-gray-600'
      : theme === 'high-contrast'
      ? 'bg-black text-yellow-300 border-yellow-300'
      : 'bg-white text-black border-gray-300';

  return (
    <div className="m-4 sm:m-8">
      {/* Display connection errors if WebRTC fails */}
      {connectionError && (
        <div className="mb-4 p-4 border rounded bg-red-100 text-red-700">{connectionError}</div>
      )}
      <div className="mb-4">
        <label className="mr-2">Your Name:</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value || `User-${Math.floor(Math.random() * 1000)}`)}
          className="border p-1 rounded"
          placeholder="Enter your name"
        />
        <span className={`ml-4 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
        <button
          className="ml-4 bg-gray-700 text-white px-2 py-1 rounded"
          onClick={() => window.location.reload()}
          disabled={isConnected}
        >
          Retry Connection
        </button>
      </div>

      {/* Editor toolbar with formatting controls */}
      <div className="w-full grid grid-cols-6 sm:grid-cols-12 bg-gray-600 p-2 sm:p-3 gap-2 text-white">
        {toolbarConfig.bold && (
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-1 sm:p-2 rounded ${editor.isActive('bold') ? 'bg-gray-800' : ''}`}
            aria-label="Toggle bold"
          >
            <FaBold />
          </button>
        )}
        {toolbarConfig.italic && (
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-1 sm:p-2 rounded ${editor.isActive('italic') ? 'bg-gray-800' : ''}`}
            aria-label="Toggle italic"
          >
            <FaItalic />
          </button>
        )}
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('strike') ? 'bg-gray-800' : ''}`}
          aria-label="Toggle strikethrough"
        >
          <FaStrikethrough />
        </button>
        {toolbarConfig.underline && (
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 sm:p-2 rounded ${editor.isActive('underline') ? 'bg-gray-800' : ''}`}
            aria-label="Toggle underline"
          >
            <FaUnderline />
          </button>
        )}
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('code') ? 'bg-gray-800' : ''}`}
          aria-label="Toggle code"
        >
          <FaCode />
        </button>
        <button
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className="p-1 sm:p-2 rounded"
          aria-label="Clear marks"
        >
          Clear Marks
        </button>
        <button
          onClick={() => editor.chain().focus().clearNodes().run()}
          className="p-1 sm:p-2 rounded"
          aria-label="Clear nodes"
        >
          Clear Nodes
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('paragraph') ? 'bg-gray-800' : ''}`}
          aria-label="Set paragraph"
        >
          <FaParagraph />
        </button>
        <div className="relative">
          <button
            onClick={() => setIsHeadingDropdownOpen(!isHeadingDropdownOpen)}
            className={`p-1 sm:p-2 rounded ${editor.isActive('heading') ? 'bg-gray-800' : ''}`}
            aria-label="Toggle headings"
          >
            <FaHeading />
          </button>
          {isHeadingDropdownOpen && (
            <div className="absolute bg-gray-700 text-white rounded mt-2 p-2 z-10">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level }).run();
                    setIsHeadingDropdownOpen(false);
                  }}
                  className={`block w-full text-left p-1 rounded ${editor.isActive('heading', { level }) ? 'bg-gray-800' : ''}`}
                  aria-label={`Toggle heading ${level}`}
                >
                  H{level}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-800' : ''}`}
          aria-label="Toggle bullet list"
        >
          <FaListUl />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-800' : ''}`}
          aria-label="Toggle ordered list"
        >
          <FaListOl />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive('blockquote') ? 'bg-gray-800' : ''}`}
          aria-label="Toggle blockquote"
        >
          <FaQuoteRight />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1 sm:p-2 rounded"
          aria-label="Insert horizontal rule"
        >
          <FaMinus />
        </button>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1 sm:p-2 rounded"
          aria-label="Undo"
        >
          <FaUndo />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1 sm:p-2 rounded"
          aria-label="Redo"
        >
          <FaRedo />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-800' : ''}`}
          aria-label="Align left"
        >
          <FaAlignLeft />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-800' : ''}`}
          aria-label="Align center"
        >
          <FaAlignCenter />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-800' : ''}`}
          aria-label="Align right"
        >
          <FaAlignRight />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1 sm:p-2 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-800' : ''}`}
          aria-label="Align justify"
        >
          <FaAlignJustify />
        </button>
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="h-8 w-8 rounded"
          aria-label="Select text color"
        />
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
          value={editor.getAttributes('highlight').color || '#ffffff'}
          className="h-8 w-8 rounded"
          aria-label="Select highlight color"
        />
        <select
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          className="bg-gray-700 text-white p-1 rounded"
          aria-label="Select font size"
          defaultValue=""
        >
          <option value="">Default (16px)</option>
          <option value="12px">12px</option>
          <option value="16px">16px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
        </select>
        <button
          onClick={() => {
            const url = window.prompt('Enter URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-1 sm:p-2 rounded ${editor.isActive('link') ? 'bg-gray-800' : ''}`}
          aria-label="Add link"
        >
          <FaLink />
        </button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="p-1 sm:p-2 rounded"
          aria-label="Remove link"
        >
          <FaUnlink />
        </button>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                editor.chain().focus().setImage({ src: e.target.result }).run();
              };
              reader.readAsDataURL(file);
            }
          }}
          className="hidden"
          id="image-upload"
          aria-label="Upload image"
        />
        <label htmlFor="image-upload" className="p-1 sm:p-2 rounded cursor-pointer">
          <FaImage />
        </label>
        <select
          onChange={(e) => setTheme(e.target.value)}
          value={theme}
          className="bg-gray-700 text-white p-1 rounded"
          aria-label="Select theme"
        >
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
          <option value="high-contrast">High Contrast</option>
        </select>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1 sm:p-2 rounded"
          aria-label="Open toolbar settings"
        >
          Settings
        </button>
      </div>
      {/* Toolbar settings modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md max-w-md">
            <h2 className="text-lg font-bold mb-4">Toolbar Settings</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={toolbarConfig.bold}
                onChange={(e) => setToolbarConfig({ ...toolbarConfig, bold: e.target.checked })}
              />
              Bold
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={toolbarConfig.italic}
                onChange={(e) => setToolbarConfig({ ...toolbarConfig, italic: e.target.checked })}
              />
              Italic
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={toolbarConfig.underline}
                onChange={(e) => setToolbarConfig({ ...toolbarConfig, underline: e.target.checked })}
              />
              Underline
            </label>
            <button
              className="mt-4 bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => setIsSettingsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Tiptap editor content area */}
      <div className={`border-2 h-80 overflow-y-auto ${editorClass}`}>
        <EditorContent editor={editor} className="tiptap w-full p-2" data-gramm="false" />
      </div>

      {/* Display connected users and edit history */}
      <UserList provider={provider} />
      <EditLog provider={provider} editor={editor} />

      {/* Word and character count */}
      <div className="mt-2 text-gray-600">
        Words: {editor.getText().split(/\s+/).filter(Boolean).length} | Characters: {editor.getText().length}
      </div>
      <div className="flex gap-2 mt-5">
        <button
          className="bg-gray-700 text-white px-2 py-1 rounded-md"
          onClick={handleEditorContent}
          aria-label="Save content"
        >
          Save
        </button>
      </div>
      {/* Toast notifications for save success/error */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Tiptap;