import { useState, useEffect, useRef,useCallback,useMemo,memo } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
  useNavigate,
  Link
} from "react-router-dom";
import { io } from "socket.io-client";
import { 
  MessageSquare, 
  ArrowUp, 
  Scale, 
  BookOpen, 
  UserCircle, 
  Trash2, 
  PanelRight, 
  Paperclip, 
  X, 
  Send, 
  Clock, 
  CheckCircle, 
  Copy, 
  Share2,
  Search,
  FileText,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";

// Initialize socket connection with error handling
const socket = io("deltahelpline-production.up.railway.app", {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

// Better socket event logging
socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO server:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
  toast.error("Connection error. Please check your internet connection.");
});

socket.on("disconnect", (reason) => {
  console.log("⚠️ Disconnected from Socket.IO server:", reason);
  if (reason === "io server disconnect") {
    // The server has forcefully disconnected the socket
    socket.connect();
  }
});

// Colors and styling constants
const THEME = {
  primary: {
    navy: "#1a365d",
    lightNavy: "#2a4365",
    gold: "#e6b618",
    burgundy: "#800020",
    darkBurgundy: "#580016",
    parchment: "#f9f5e7",
    offWhite: "#f8f9fa",
    border: "#e2e8f0",
  },
  typography: {
    heading: "font-serif font-semibold",
    body: "font-sans",
  },
  shadow: "shadow-md hover:shadow-lg transition-shadow duration-300",
};

// Helper functions
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if message is from today
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  } else {
    // Show date and time for older messages
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
};

const truncateText = (text, maxLength = 100) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Reusable Button component
const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  className = "", 
  icon = null 
}) => {
  const baseStyle = "rounded-lg flex items-center justify-center gap-2 transition-all duration-200";
  
  const variants = {
    primary: "bg-legal-burgundy text-legal-gold hover:bg-legal-darkburgundy",
    secondary: "bg-legal-lightnavy text-white hover:bg-legal-navy",
    outline: "border border-legal-burgundy text-legal-burgundy hover:bg-legal-burgundy/10",
    ghost: "text-legal-navy hover:bg-legal-navy/10",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  
  const sizes = {
    sm: "px-3 py-2 text-sm min-h-[36px]", // Touch-optimized minimum height
    md: "px-4 py-3 min-h-[44px]", // Recommended touch target size (44px)
    lg: "px-6 py-4 text-lg min-h-[48px]",
    icon: "p-3 min-h-[44px] min-w-[44px]", // Touch-optimized icon buttons
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && icon}
      {children}
    </motion.button>
  );
};

// Toast notifications with better styling
const showToast = {
  success: (message) => {
    toast.success(message, {
      style: {
        background: "#f0fff4",
        color: "#2f855a",
        border: "1px solid #9ae6b4",
      },
      duration: 3000,
    });
  },
  error: (message) => {
    toast.error(message, {
      style: {
        background: "#fff5f5",
        color: "#c53030",
        border: "1px solid #feb2b2",
      },
      duration: 4000,
    });
  },
  info: (message) => {
    toast(message, {
      icon: "ℹ️",
      style: {
        background: "#ebf8ff",
        color: "#2c5282",
        border: "1px solid #bee3f8",
      },
    });
  },
};

// Enhanced typing indicator component
const TypingIndicator = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 p-3 mb-4"
    >
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-legal-burgundy" />
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-legal-burgundy rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-legal-burgundy rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-legal-burgundy rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
      <span className="text-sm text-legal-navy/70">
        {typingUsers.length === 1 
          ? `${typingUsers[0]} is typing...` 
          : `${typingUsers.length} people are typing...`
        }
      </span>
    </motion.div>
  );
};

// Chat bubble component for cleaner JSX
const ChatBubble = ({ message }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isResponder = message.role === "responder";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isResponder ? "justify-start" : "justify-end"} mb-4 sm:mb-6`}
    >
<div className={`max-w-3xl w-full sm:w-auto p-3 sm:p-4 rounded-xl group ${
  isResponder
    ? "bg-slate-800 text-white border-l-4 border-yellow-500"
    : "bg-gray-50 border-r-4 border-slate-600"
}`}>
  <div className="flex items-start gap-3">
    {isResponder && (
      <Scale className="w-6 h-6 mt-1 text-yellow-500 flex-shrink-0" />
    )}
    <div className="flex-1 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs sm:text-sm font-medium flex items-center">
          {isResponder ? "LegalAI Counsel" : "Client"}
          {isResponder && (
            <span className="ml-2 text-xs bg-yellow-500 text-slate-900 px-1.5 sm:px-2 py-0.5 rounded-full">Official</span>
          )}
        </p>

      </div>
      <div className="relative">

        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-80 sm:max-h-96">
          {message.message}
        </p>
        <button
          onClick={() => copyToClipboard(message.message)}
          className={`absolute top-0 right-0 p-1 rounded-full opacity-0 hover:opacity-100 focus:opacity-100 bg-opacity-20 hover:bg-opacity-30 ${
            isResponder ? "bg-white text-white" : "bg-slate-600 text-slate-600"
          }`}
          title="Copy text"
        >
          {copied ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      {message.image && (
        <img
          src={message.image}
          alt="Case document"
          className="mt-3 rounded-lg border border-gray-300 max-w-xs hover:opacity-90 transition-opacity cursor-pointer"
          onClick={() => window.open(message.image, '_blank')}
        />
      )}
      {message.citations && (
        <div className={`mt-3 text-xs opacity-80 border-t ${isResponder ? "border-slate-700" : "border-gray-300"} pt-2`}>
          <p className="font-medium mb-1 flex items-center">
            <span>Citations</span>
            <span className="ml-2 bg-slate-700 text-xs text-white px-1.5 py-0.5 rounded">Legal</span>
          </p>
          <ul className="list-disc list-inside">
            {message.citations.map((citation, idx) => (
              <li key={idx} className="truncate hover:text-clip hover:overflow-visible">{citation}</li>
            ))}
          </ul>
        </div>
      )}
     </div>
   </div>
 </div>
     </motion.div>
   );
 };

// Improved Chat component
const Chat = () => {
  const { roomId } = useParams();
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caseInfo, setCaseInfo] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const [userThinking, setUserThinking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const debouncedStopTyping = useRef(null);
  const autoScrollRef = useRef(true);
  const scrollTimeoutRef = useRef(null);
  const messageRef = useRef("");
  const selectedImageRef = useRef(null);
  const isLoadingRef = useRef(false);
  const progressIntervalRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();



  // Detect scroll position to manage auto-scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      // Throttle scroll handling to prevent excessive state updates
      if (scrollTimeoutRef.current) return;
      
      scrollTimeoutRef.current = setTimeout(() => {
        if (!chatContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        autoScrollRef.current = isNearBottom;
        setShowScrollButton(!isNearBottom && chat.length > 4);
        
        scrollTimeoutRef.current = null;
      }, 100);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      };
    }
  }, []);

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollRef.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end"
      });
    }
  }, [chat]);

  // Offline mode detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast.success("Connection restored");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      showToast.error("Connection lost. You're now offline");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Draft auto-save functionality
  useEffect(() => {
    const draftKey = `draft-${roomId}`;
    
    // Load draft on mount
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !message) {
      setMessage(savedDraft);
      setDraftMessage(savedDraft);
    }
  }, [roomId]);

  // Auto-save draft as user types
  useEffect(() => {
    const draftKey = `draft-${roomId}`;
    
    if (message !== draftMessage) {
      const timeoutId = setTimeout(() => {
        if (message.trim()) {
          localStorage.setItem(draftKey, message);
          setDraftMessage(message);
        } else {
          localStorage.removeItem(draftKey);
          setDraftMessage("");
        }
      }, 1000); // Auto-save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [message, draftMessage, roomId]);







  // Socket.io event handling with improved flow
  useEffect(() => {
    // Show loading state immediately
    setIsLoading(true);
    
    // Create a clean connection and join room
    socket.emit("joinRoom", roomId);
    socket.emit("getMessages", roomId);
    socket.emit("userJoined", { roomId });
    
    // Fetch mock case info with more realistic details
    const caseNumber = roomId?.slice(-8).toUpperCase() || 'UNKNOWN';
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
    
    setCaseInfo({
      caseNumber,
      status: "Active",
      created: randomDate.toLocaleDateString(),
      category: "Legal Consultation",
      assignedTo: "AI Legal Assistant",
      priority: Math.random() > 0.7 ? "High" : "Normal"
    });

    // Event handlers with improved animation timing
    const handleChatHistory = (messages) => {
      if (!messages || messages.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Only add IDs if they don't exist, preserve existing timestamps
      const messagesWithTimestamps = messages.map((msg, index) => {
        const newMsg = { ...msg };
        
        // Only add ID if missing
        if (!newMsg.id) {
          newMsg.id = `msg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Only add timestamp if completely missing (don't override existing ones)
        if (!newMsg.timestamp) {
          // Create timestamps that are spread out in the past for missing ones
          newMsg.timestamp = new Date(Date.now() - (messages.length - index) * 1000).toISOString();
        }
        
        return newMsg;
      });
      
      setChat(messagesWithTimestamps);
      setIsLoading(false);
      
      // Slight delay to ensure DOM updates before scrolling
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    };

    const handleMessage = (newMessage) => {
      setChat((prevChat) => {
        // Check if message already exists (prevent duplicates from socket echo)
        const messageExists = prevChat.some(msg => 
          msg.message === newMessage.message && 
          Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp || new Date()).getTime()) < 5000
        );
        
        if (messageExists) {
          console.log('Duplicate message detected, skipping');
          return prevChat;
        }
        
        // Only add timestamp and ID if they don't exist (preserve existing ones)
        const messageWithTimestamp = { ...newMessage };
        
        if (!messageWithTimestamp.id) {
          messageWithTimestamp.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        if (!messageWithTimestamp.timestamp) {
          messageWithTimestamp.timestamp = new Date().toISOString();
        }
        
        return [...prevChat, messageWithTimestamp];
      });
      
      setIsLoading(false);
      setUserThinking(false);
      
      // Wait for state update, then scroll
      requestAnimationFrame(() => {
        if (autoScroll) {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
          // Notify user of new message if not auto-scrolling
          showToast.info("New message received");
        }
      });
    };

    const handleRoomDeleted = ({ roomId: deletedRoomId }) => {
      console.log(`Room ${deletedRoomId} has been deleted`);
      showToast.info(`Case #${deletedRoomId?.slice(-8).toUpperCase() || 'UNKNOWN'} has been closed`);
      
      // Smooth transition before navigating away
      setTimeout(() => navigate("/"), 1000);
    };

    const handleTyping = (data) => {
      const userName = data?.userName || (window.location.pathname.includes("/chat/") ? "Client" : "LegalAI Counsel");
      setIsTyping(true);
      setTypingUsers(prev => {
        if (!prev.includes(userName)) {
          return [...prev, userName];
        }
        return prev;
      });
      
      // If we were already at the bottom, scroll to see the typing indicator
      if (autoScroll) {
        requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }
    };

    const handleStopTyping = (data) => {
      const userName = data?.userName || (window.location.pathname.includes("/chat/") ? "Client" : "LegalAI Counsel");
      setTypingUsers(prev => prev.filter(user => user !== userName));
      
      // Only set isTyping to false if no one is typing
      setTimeout(() => {
        setTypingUsers(current => {
          if (current.length === 0) {
            setIsTyping(false);
          }
          return current;
        });
      }, 100);
    };

    const handleError = (error) => {
      console.error("Socket error:", error);
      showToast.error("An error occurred. Please try again.");
      setIsLoading(false);
      setUserThinking(false);
    };

    // Register event listeners
    socket.on("chatHistory", handleChatHistory);
    socket.on("question", handleMessage);
    socket.on("response", handleMessage);
    socket.on("roomDeleted", handleRoomDeleted);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("error", handleError);

    // Clean up event listeners on unmount
    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("chatHistory", handleChatHistory);
      socket.off("question", handleMessage);
      socket.off("response", handleMessage);
      socket.off("roomDeleted", handleRoomDeleted);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("error", handleError);
      
      // Clear any pending timeouts/intervals
      if (debouncedStopTyping.current) {
        clearTimeout(debouncedStopTyping.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [roomId]);

  // Send message with improved validation and loading state
  const sendMessage = (e = null) => {
    if (e) e.preventDefault();
    
    // Check if message or image exists and not already loading
    if ((message.trim() || selectedImage) && !isLoading) {
      // Set thinking status first for better UX
      setUserThinking(true);
      setIsLoading(true);
      
      const role = window.location.pathname.includes("/chat/")
        ? "responder"
        : "asker";
      
      if (selectedImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const timestamp = new Date().toISOString();
          const messageData = {
            roomId,
            msg: message,
            image: reader.result,
            timestamp,
          };
          socket.emit(role === "responder" ? "response" : "question", messageData);
          
          // Don't add locally - let socket echo handle it to preserve timestamps
        };
        reader.readAsDataURL(selectedImage);
      } else {
        const timestamp = new Date().toISOString();
        const messageData = {
          roomId,
          msg: message,
          timestamp,
        };
        socket.emit(role === "responder" ? "response" : "question", messageData);
        
        // Don't add locally - let socket echo handle it to preserve timestamps
      }

      // Clear message field and attachments
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      
      // Clear draft from localStorage
      const draftKey = `draft-${roomId}`;
      localStorage.removeItem(draftKey);
      setDraftMessage("");
      
      socket.emit("stopTyping", { roomId });
      
      // Refocus the input with slight delay for better mobile experience
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 300);
      
      // Scroll to bottom to show the sent message
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  };

  // Handle input change with improved typing indicators
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Send typing event with user information
    const userName = window.location.pathname.includes("/chat/") ? "LegalAI Counsel" : "Client";
    socket.emit("typing", { roomId, userName });
    autoResize(e.target);

    // Clear previous timeout
    if (debouncedStopTyping.current) {
      clearTimeout(debouncedStopTyping.current);
    }
    
    // Set new timeout
    debouncedStopTyping.current = setTimeout(() => {
      socket.emit("stopTyping", { roomId, userName });
    }, 1000);
  };

  // Enhanced image handling with validation
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast.error("Please select a valid image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error("Image is too large (max 5MB)");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 100);
    
    setSelectedImage(file);
    
    // Create image preview with progress
    const reader = new FileReader();
    reader.onloadstart = () => {
      setUploadProgress(10);
    };
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 80 + 10; // 10-90%
        setUploadProgress(progress);
      }
    };
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        showToast.success("Image attached successfully!");
      }, 500);
    };
    reader.onerror = () => {
      showToast.error("Failed to process image");
      setIsUploading(false);
      setUploadProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    reader.readAsDataURL(file);
    
    // Focus on text input after image upload
    setTimeout(() => messageInputRef.current?.focus(), 100);
  };

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Focus on text input after removing image
    setTimeout(() => messageInputRef.current?.focus(), 100);
  };

  // Improved share functionality with fallbacks
  const shareChat = () => {
    const shareData = {
      title: `LegalAI Case #${roomId?.slice(-8).toUpperCase() || 'UNKNOWN'}`,
      text: 'Review this legal consultation',
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => showToast.success("Case shared successfully"))
        .catch(err => {
          console.error("Share error:", err);
          // Fallback to clipboard copy
          copyToClipboard(shareData.url);
        });
    } else {
      copyToClipboard(shareData.url);
    }
  };
  
  // Helper for copying text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast.success("Case link copied to clipboard"))
      .catch(err => showToast.error("Could not copy link"));
  };

  // Create new chat with transition effects
  const createNewChat = () => {
    setIsLoading(true);
    socket.emit("createRoom", (newRoomId) => {
      navigate(`/chat/${newRoomId}`);
      showToast.success("New case created");
    });
  };

  // Auto-resize textarea with height limits
  const autoResize = (textarea) => {
    // Reset height temporarily to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height with a max height of 150px
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  };


  
  // Scroll to bottom button handler
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    autoScrollRef.current = true;
  };

  // Update refs when state changes
  useEffect(() => {
    messageRef.current = message;
    selectedImageRef.current = selectedImage;
    isLoadingRef.current = isLoading;
  });

  // Handle Enter key on textarea (since it's in a form, we need to handle it manually)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      if ((message.trim() || selectedImage) && !isLoading) {
        sendMessage(); // Call without event
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-legal-parchment">
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium"
          >
            ⚠️ You're offline. Messages will be sent when connection is restored.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-legal-navy text-legal-gold py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between border-b border-legal-border shadow-md sticky top-0 z-10">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {}}
          className="p-3 min-h-[44px] min-w-[44px] rounded-xl bg-legal-burgundy text-legal-gold hover:bg-legal-darkburgundy transition-colors flex-shrink-0 shadow-md active:shadow-sm"
          title="New Case"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
          
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-legal-gold flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-serif font-semibold text-legal-gold truncate">
              <span className="hidden sm:inline">AI Legal Assistant</span>
              <span className="sm:hidden">LegalAI</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">

          
          <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={shareChat}
          className="p-3 min-h-[44px] min-w-[44px] rounded-xl bg-legal-burgundy text-legal-gold hover:bg-legal-darkburgundy transition-colors shadow-md active:shadow-sm"
          title="Share Case"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
          
          <div className="p-3 min-h-[44px] min-w-[44px] rounded-xl bg-legal-burgundy shadow-md flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-legal-gold" />
          </div>
        </div>
      </header>

      {/* Main content with optional knowledge panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Messages */}
        <main 
          ref={chatContainerRef}
          className="flex-1 overflow-auto bg-legal-parchment p-3 sm:p-4 lg:p-6 relative"
        >
          {/* Case information banner */}
          {caseInfo && (
            <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 sm:mb-6 p-3 bg-legal-navy/5 rounded-lg border border-legal-navy/20 shadow-sm"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-legal-burgundy flex-shrink-0" />
            <h2 className="font-medium text-sm sm:text-base">Case #{caseInfo.caseNumber}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-legal-navy/70">Status:</span>
                    <span className={`font-medium ${
                      caseInfo.status === "Active" ? "text-green-600" : "text-legal-burgundy"
                    }`}>
                      {caseInfo.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-legal-navy/70">Created:</span>
                    <span className="font-medium">{caseInfo.created}</span>
                  </div>
                  {caseInfo.priority && (
                    <div className="flex items-center gap-1">
                      <span className="text-legal-navy/70">Priority:</span>
                      <span className={`font-medium ${
                        caseInfo.priority === "High" ? "text-red-600" : "text-blue-600"
                      }`}>
                        {caseInfo.priority}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Welcome message for empty chats */}
          {chat.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-6 sm:py-10 px-4"
            >
              <Scale className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-legal-burgundy opacity-80" />
              <h2 className="text-xl sm:text-2xl font-serif font-semibold mb-2 sm:mb-3 text-legal-navy">
                Welcome to AI Legal Assistant
              </h2>
              <p className="max-w-lg mx-auto text-sm sm:text-base text-legal-navy/80 mb-4 sm:mb-6 leading-relaxed">
                Describe your legal situation to receive AI-generated insights informed by established legal principles and public resources. This service is for informational purposes only and does not constitute legal advice or create an attorney-client relationship.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => messageInputRef.current?.focus()}
                className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-4 sm:py-2 bg-legal-burgundy text-legal-gold rounded-lg hover:bg-legal-darkburgundy transition-colors text-sm sm:text-base"
              >
                <MessageSquare className="w-4 h-4" />
                Start Consultation
              </motion.button>
            </motion.div>
          )}

          {/* Loading skeleton */}
          {isLoading && chat.length === 0 && (
            <div className="space-y-6 py-4 animate-pulse">
              {[1, 2].map((_, idx) => (
                <div key={idx} className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-3xl p-4 rounded-xl ${
                    idx % 2 === 0 
                      ? "bg-slate-800/30 border-l-4 border-yellow-500/50" 
                      : "bg-gray-50/50 border-r-4 border-slate-600/50"
                  } w-4/5`}>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Chat messages */}
          <AnimatePresence>
            {chat.map((msg, idx) => (
              <ChatBubble 
                key={idx} 
                message={msg}
              />
            ))}
          </AnimatePresence>
          
          {/* Enhanced typing indicator */}
          <AnimatePresence>
            <TypingIndicator typingUsers={typingUsers} />
          </AnimatePresence>
          
          {/* User thinking indicator */}
          {userThinking && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-end mb-4"
            >
              <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-legal-navy/60 flex items-center gap-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Clock className="w-3 h-3" />
                </motion.div>
                Processing...
              </div>
            </motion.div>
          )}
          
          {/* Scroll to bottom button - visible when not at bottom */}
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 right-6 p-2 bg-legal-burgundy text-white rounded-full shadow-lg"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>  
          )}
          
          <div ref={chatEndRef} />
        </main>


      </div>

      {/* Input Area */}
      <form 
        onSubmit={sendMessage} 
        className="bg-legal-offwhite p-3 sm:p-4 border-t border-legal-border shadow-md sticky bottom-0 z-10"
      >
        <div className="max-w-4xl mx-auto relative">
          {/* Upload progress indicator */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-blue-900">Uploading image...</span>
                      <span className="text-xs text-blue-700">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image preview with animation */}
          <AnimatePresence>
            {imagePreview && !isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mb-2 relative inline-block"
              >
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="h-16 rounded-md border border-legal-border shadow-sm"
                />
                <button
                type="button"
                onClick={removeSelectedImage}
                className="absolute -top-2 -right-2 bg-legal-burgundy text-white rounded-full p-2 shadow-md hover:bg-legal-darkburgundy transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Remove image"
                 >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>


          
          {/* Input Area */}
<div className="flex gap-3 sm:gap-4 items-end">
  {/* File input button with hover effect */}
  <div className="relative">
    <input
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      className="hidden"
      ref={fileInputRef}
      aria-label="Attach image"
    />
    <Button
    type="button"
    variant="secondary"
    size="icon"
    onClick={() => fileInputRef.current.click()}
    className="min-h-[44px] min-w-[44px] p-3 transition-all hover:bg-legal-burgundy/90 active:scale-95 flex-shrink-0 bg-legal-burgundy border-2 border-legal-burgundy rounded-lg shadow-md hover:shadow-lg"
    aria-label="Attach image"
    >
    <Paperclip className="w-5 h-5 text-legal-gold" />
    </Button>
  </div>
  
  {/* Text input with improved accessibility */}
  <div className="flex-1 relative">
  <textarea
  ref={messageInputRef}
  value={message}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  placeholder="Describe your legal issue..."
  className="w-full p-3 sm:p-4 rounded-lg bg-white border border-legal-border focus:ring-2 focus:ring-legal-burgundy focus:border-legal-burgundy transition-colors resize-none text-base min-h-[44px]"
  rows="1"
  disabled={isLoading || !isOnline}
  aria-label="Message input"
  />
  <div className="absolute bottom-2 right-2 sm:right-3 flex items-center gap-2">
  {draftMessage && draftMessage !== message && (
  <span className="text-xs text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full">
      Draft saved
      </span>
      )}
       {message.length > 0 && (
         <span className="text-xs text-legal-navy/40 hidden sm:inline">
           {message.length} characters
         </span>
       )}
     </div>
   </div>
  
  {/* Send button with visual feedback */}
  <Button
  type="submit"
  variant={message.trim() || selectedImage ? "primary" : "disabled"}
  size="icon"
  className={`min-h-[48px] min-w-[48px] p-3 transition-all flex-shrink-0 rounded-xl ${(message.trim() || selectedImage) && !isLoading ? 'hover:bg-legal-darkburgundy active:scale-95 shadow-lg' : 'opacity-70 cursor-not-allowed'}`}
  disabled={isLoading || (!message.trim() && !selectedImage)}
  aria-label="Send message"
  >
  <Send className="w-5 h-5" />
  </Button>
</div>

{/* Keyboard shortcut hint */}
<div className="mt-2 flex justify-end items-center">
  <div className="text-xs text-legal-navy/50 flex items-center gap-1">
    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-md text-xs font-mono">Enter</kbd>
    <span className="ml-1 hidden sm:inline">to send • Shift+Enter for new line</span>
    <span className="ml-1 sm:hidden">to send</span>
  </div>
</div>
        </div>
      </form>
    </div>
  );
};

// Improved Responder Dashboard
const Responder = () => {
  const [activeRooms, setActiveRooms] = useState({});
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statistics, setStatistics] = useState({
    active: 0,
    resolved: 0,
    pending: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("latest");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Cleaner notification sound player with better error handling
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/soundrn.mp3');
      audio.play()
        .catch(error => console.warn('Sound playback failed:', error));
    } catch (error) {
      console.warn('Could not play notification:', error);
    }
  }, []);

  // Add notification with timestamp and automatic cleanup
  const addNotification = useCallback((message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep last 50
      return updated;
    });
    
    if (!showNotifications) {
      // Visual indicator for new notifications without being intrusive
      showToast.info("New notification received", { duration: 3000 });
    }
  }, [showNotifications]);

  // Format room data for display with more efficient processing
  const formatRoomData = useCallback((roomsList) => {
    const formattedRooms = roomsList.reduce((acc, room) => {
      acc[room.id] = {
        latestMessage: room.latestMessage || "New case opened",
        timestamp: room.timestamp || new Date().toISOString(),
        status: room.status || "active",
        client: room.client || "Anonymous Client",
        priority: room.priority || "normal"
      };
      return acc;
    }, {});
    
    // Update statistics in one pass
    const statCounts = Object.values(formattedRooms).reduce(
      (counts, room) => {
        counts[room.status]++;
        return counts;
      }, 
      { active: 0, resolved: 0, pending: 0, total: Object.keys(formattedRooms).length }
    );
    
    setStatistics(statCounts);
    return formattedRooms;
  }, []);

  // Memoized filtered and sorted rooms for better performance
  const filteredRooms = useMemo(() => {
    const roomEntries = Object.entries(activeRooms);
    
    // Apply filters
    let filtered = roomEntries;
    
    if (filter !== "all") {
      filtered = filtered.filter(([_, room]) => room.status === filter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ([roomId, room]) => 
          roomId.toLowerCase().includes(query) ||
          room.latestMessage.toLowerCase().includes(query) ||
          room.client.toLowerCase().includes(query)
      );
    }
    
    // Sort rooms
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp));
    } else if (sortBy === "priority") {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      filtered.sort((a, b) => priorityOrder[a[1].priority] - priorityOrder[b[1].priority]);
    }
    
    return filtered;
  }, [activeRooms, filter, searchQuery, sortBy]);

  // Initialize socket event listeners with better cleanup
  useEffect(() => {
    setIsLoading(true);
    
    // Request rooms data immediately
    socket.emit("getRooms");
  
    const handleUserJoined = ({ roomId }) => {
      playNotificationSound();
      const caseId = roomId?.slice(-8).toUpperCase() || 'UNKNOWN';
      addNotification(`New client joined case #${caseId}`, 'success');
      showToast.success(`New client in case #${caseId}`);
      
      // Update room list
      socket.emit("getRooms");
    };
  
    const handleRoomsList = (roomsList) => {
      const formattedRooms = formatRoomData(roomsList);
      setActiveRooms(formattedRooms);
      setIsLoading(false);
    };
  
    const handleQuestion = ({ roomId, msg }) => {
      // Update room with new message in one operation
      setActiveRooms(prevActive => ({
        ...prevActive,
        [roomId]: {
          ...prevActive[roomId],
          latestMessage: msg,
          timestamp: new Date().toISOString(),
          status: "active"  // Reset to active if there's a new question
        }
      }));
      
      // Notify user
      const caseId = roomId?.slice(-8).toUpperCase() || 'UNKNOWN';
      playNotificationSound();
      addNotification(`New message in case #${caseId}`, 'info');
    };
  
    const handleRoomDeleted = ({ roomId }) => {
      const caseId = roomId?.slice(-8).toUpperCase() || 'UNKNOWN';
      
      // Remove room in one operation
      setActiveRooms(prevRooms => {
        const newRooms = { ...prevRooms };
        delete newRooms[roomId];
        return newRooms;
      });
      
      addNotification(`Case #${caseId} has been closed`, 'info');
      showToast.success(`Case #${caseId} has been closed`, { duration: 3000 });
    };
  
    // Set up event listeners
    socket.on("userJoined", handleUserJoined);
    socket.on("roomsList", handleRoomsList);
    socket.on("roomDeleted", handleRoomDeleted);
    socket.on("question", handleQuestion);
    // Removed infinite loop - socket.on("getRooms", () => socket.emit("getRooms"));
  
    // Clean up all listeners on unmount
    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("roomsList", handleRoomsList);
      socket.off("roomDeleted", handleRoomDeleted);
      socket.off("question", handleQuestion);
      // socket.off("getRooms"); // Removed since we removed the listener
    };
  }, [addNotification, formatRoomData, playNotificationSound]);
  
  // Handler for room click with navigation
  const handleRoomClick = useCallback((roomId) => {
    navigate(`/chat/${roomId}`);
  }, [navigate]);

  // Room action handlers
  const deleteRoom = useCallback((roomId, e) => {
    if (e) e.stopPropagation();
    socket.emit("deleteRoom", roomId);
  }, []);

  const markRoomResolved = useCallback((roomId, e) => {
    if (e) e.stopPropagation();
    
    setActiveRooms(prevRooms => ({
      ...prevRooms,
      [roomId]: {
        ...prevRooms[roomId],
        status: "resolved"
      }
    }));
    
    showToast.success(`Case #${roomId?.slice(-8).toUpperCase() || 'UNKNOWN'} marked as resolved`, { duration: 3000 });
  }, []);
  
  const togglePriority = useCallback((roomId, e) => {
    if (e) e.stopPropagation();
    
    setActiveRooms(prevRooms => {
      const currentPriority = prevRooms[roomId]?.priority || "normal";
      const nextPriority = {
        low: "normal",
        normal: "high",
        high: "low"
      };
      
      return {
        ...prevRooms,
        [roomId]: {
          ...prevRooms[roomId],
          priority: nextPriority[currentPriority]
        }
      };
    });
  }, []);

  // Memoized badge components for better rendering performance
  const PriorityBadge = memo(({ priority }) => {
    const styles = {
      high: "bg-red-100 text-red-800 border-red-200",
      normal: "bg-blue-100 text-blue-800 border-blue-200",
      low: "bg-green-100 text-green-800 border-green-200"
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[priority]}`}>
        {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Unknown'}
      </span>
    );
  });

  const StatusBadge = memo(({ status }) => {
    const styles = {
      active: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      resolved: "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status]}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  });

  // Animation variants for smoother transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24 
      }
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-legal-offwhite">
      {/* Dashboard Header - Simplified and Optimized */}
      <header className="bg-legal-navy text-legal-gold p-4 border-b border-legal-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6" />
            <h1 className="text-xl font-serif font-semibold">
              LegalAI Case Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-60 pl-9 pr-3 py-2 rounded-lg bg-legal-navy/70 border border-legal-gold/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-legal-gold/50"
              />
            </div>
            
            <Button
              onClick={() => setShowNotifications(!showNotifications)}
              variant="secondary"
              size="icon"
              className="relative"
              aria-label="Show notifications"
            >
              <MessageSquare className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </Button>
            
            <Button
              onClick={() => navigate("/")}
              variant="primary"
              size="sm"
              aria-label="Switch to client view"
            >
              <UserCircle className="w-4 h-4 mr-1" />
              <span className="hidden md:inline">Switch to Client</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Statistics Bar */}
      <div className="bg-legal-parchment border-b border-legal-border py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white p-3 rounded-lg border border-legal-border shadow-sm"
            >
              <div className="text-xs text-legal-navy/70 mb-1">Active Cases</div>
              <div className="text-2xl font-semibold text-legal-navy">{statistics.active}</div>
            </motion.div>
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white p-3 rounded-lg border border-legal-border shadow-sm"
            >
              <div className="text-xs text-legal-navy/70 mb-1">Pending</div>
              <div className="text-2xl font-semibold text-legal-navy">{statistics.pending}</div>
            </motion.div>
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white p-3 rounded-lg border border-legal-border shadow-sm"
            >
              <div className="text-xs text-legal-navy/70 mb-1">Resolved</div>
              <div className="text-2xl font-semibold text-legal-navy">{statistics.resolved}</div>
            </motion.div>
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white p-3 rounded-lg border border-legal-border shadow-sm"
            >
              <div className="text-xs text-legal-navy/70 mb-1">Total Cases</div>
              <div className="text-2xl font-semibold text-legal-navy">{statistics.total}</div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Case List */}
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto">
            {/* Filters and Controls - More Compact and Mobile-Friendly */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {["all", "active", "pending", "resolved"].map((filterType) => (
                  <Button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    variant={filter === filterType ? "primary" : "outline"}
                    size="sm"
                    className="capitalize"
                  >
                    {filterType}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-legal-navy">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="border border-legal-border rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-legal-gold/50"
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
            
            {/* Cases Grid with Animation */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {isLoading ? (
                // Improved loading skeleton
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-legal-border p-4 shadow-legal animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-4/5 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded mt-4"></div>
                  </div>
                ))
              ) : filteredRooms.length === 0 ? (
                <motion.div 
                  className="col-span-full text-center text-legal-darknavy p-8"
                  variants={itemVariants}
                >
                  <Scale className="w-12 h-12 mx-auto mb-4 text-legal-burgundy" />
                  <p className="text-lg">No cases match your criteria</p>
                  <Button
                    onClick={() => {
                      setFilter("all");
                      setSearchQuery("");
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                </motion.div>
              ) : (
                filteredRooms.map(([roomId, roomData]) => (
                  <motion.div
                    key={roomId}
                    variants={itemVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`bg-white rounded-xl border ${
                      roomData.priority === "high" ? "border-red-300" : "border-legal-border"
                    } p-4 shadow-legal cursor-pointer transition-all duration-200`}
                    onClick={() => handleRoomClick(roomId)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="w-4 h-4 text-legal-burgundy" />
                          <h3 className="font-semibold text-legal-darknavy">
                            Case #{roomId?.slice(-8).toUpperCase() || 'UNKNOWN'}
                          </h3>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                          <StatusBadge status={roomData.status} />
                          <PriorityBadge priority={roomData.priority} />
                        </div>
                        
                        <p className="text-sm text-legal-darknavy/80 line-clamp-2 mb-3">
                          {roomData.latestMessage || "New case opened"}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-legal-navy/60">
                            {formatTimestamp(roomData.timestamp)}
                          </div>
                          <div className="text-xs text-legal-navy/70">
                            {roomData.client}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons with tooltips */}
                    <div className="flex justify-between mt-4 pt-3 border-t border-legal-border">
                      <Button
                        onClick={() => handleRoomClick(roomId)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 hover:bg-legal-gold/20"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Review
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => togglePriority(roomId, e)}
                          variant="ghost"
                          size="icon"
                          className="group relative"
                          aria-label="Change priority"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-legal-navy text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Change priority
                          </span>
                        </Button>
                        
                        <Button
                          onClick={(e) => markRoomResolved(roomId, e)}
                          variant="ghost"
                          size="icon"
                          className="group relative"
                          aria-label="Mark as resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-legal-navy text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Mark as resolved
                          </span>
                        </Button>
                        
                        <Button
                          onClick={(e) => deleteRoom(roomId, e)}
                          variant="ghost"
                          size="icon"
                          className="group relative"
                          aria-label="Close case"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Close case
                          </span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </main>

        {/* Notifications Panel with Animation */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "350px", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full border-l border-legal-border bg-white overflow-y-auto shadow-lg"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-serif font-semibold text-legal-navy">
                    Notifications
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowNotifications(false)}
                    aria-label="Close notifications"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="text-center p-6 text-legal-navy/60">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No new notifications</p>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {notifications.map(notification => (
                      <motion.div 
                        key={notification.id}
                        variants={itemVariants}
                        className={`p-3 border rounded-lg ${
                          notification.type === 'success' 
                            ? 'border-green-200 bg-green-50' 
                            : notification.type === 'error'
                            ? 'border-red-200 bg-red-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-sm ${
                            notification.type === 'success' 
                              ? 'text-green-800' 
                              : notification.type === 'error'
                              ? 'text-red-800'
                              : 'text-blue-800'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </motion.div>
                    ))}
                    
                    {notifications.length > 0 && (
                      <Button
                        onClick={() => setNotifications([])}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        Clear All
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const App = () => {
  const roomId = getRoomIdForUser();

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={`/user/${roomId}`} replace />}
          />
          <Route
            path="/user/:roomId"
            element={<Chat />}
          />
          <Route
            path="/responder"
            element={<Responder />}
          />
          <Route
            path="/chat/:roomId"
            element={<Chat />}
          />
          <Route
            path="*"
            element={<Navigate to={`/user/${roomId}`} replace />}
          />
        </Routes>
      </div>
      <Toaster />
    </Router>
  );
};

const getRoomIdForUser = () => {
  return `room-${Math.random().toString(36).substr(2, 9)}`;
};

export default App;
