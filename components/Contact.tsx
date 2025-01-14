'use client';

import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="mt-8">
      <form 
        action="https://formsubmit.co/sawanjishnu6@gmail.com" 
        method="POST"
        className="space-y-6"
      >
        <input type="hidden" name="_captcha" value="false" />
        <input type="hidden" name="_next" value={`${window.location.origin}/thank-you`} />
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                     transition duration-150 ease-in-out"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                     transition duration-150 ease-in-out"
            placeholder="Your email"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            name="message"
            id="message"
            required
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                     transition duration-150 ease-in-out resize-none"
            placeholder="Your message here"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                     shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
                     transition duration-150 ease-in-out transform hover:scale-105"
          >
            Send Message
          </button>
        </div>
      </form>

      <footer className="mt-8 text-center text-sm text-gray-500">
        Copyright © {new Date().getFullYear()} Anjishnu Saw (anjishnu@anjishnusaw.tk)
      </footer>

      <style jsx global>{`
        /* Custom styles similar to your Python version */
        form {
          background-color: white;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        input, textarea {
          width: 100%;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #6366f1;
          ring: 2px solid #6366f1;
        }

        button[type="submit"] {
          background-color: #4f46e5;
          transition: all 0.3s ease;
        }

        button[type="submit"]:hover {
          background-color: #4338ca;
        }

        footer {
          margin-top: 2rem;
          padding: 1rem;
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default Contact; 