import React, { useState } from "react";
import { assets } from "../../assets/assets";
import emailjs from "emailjs-com";

const Footer = () => {
  const [email, setEmail] = useState("");

  const sendEmail = (e) => {
    e.preventDefault();

    if (!email) return alert("Please enter an email!");

    emailjs
      .send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          user_email: email,
          time: new Date().toLocaleString(),
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      )
      .then(() => {
        alert("Subscribed successfully ✅");
        setEmail("");
      })
      .catch((error) => {
        console.error(error);
        alert("Error subscribing ❌");
      });
  };

  return (
    <footer className="bg-gray-800 md:px-36 text-left w-full mt-10">
      <div className="flex flex-col md:flex-row items-start px-8 md:px-0 justify-center gap-10 md:gap-32 py-10 border-b border-white">
        <div className="flex flex-col md:item-start items-center w-full">
          <img
            onClick={() => (window.location.href = "/")}
            className="w-12 lg:w-16 cursor-pointer"
            src={assets.logo}
            alt="logo"
          />
          <p className="mt-6 text-center md:text-left text-sm text-white">
            A ranwebsite on internet lol
          </p>
        </div>

        <div className="hidden md:flex flex-col items-start w-full">
          <h2 className="font-semibold text-white mb-5">
            Subscribe to our newsletter
          </h2>
          <p className="text-sm text-white/80">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <form onSubmit={sendEmail} className="flex items-center gap-2 pt-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-500/30 bg-gray-800 text-gray-200 placeholder-gray-500 outline-none w-64 h-9 rounded px-2 text-sm"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 w-24 h-9 text-white rounded"
            >
              Subscribe
            </button>
          </form>
        </div>
        {/* <div className="w-30flex items-center gap-3 max-md:mt-4">
          <a href="https://www.facebook.com/gk123a">
            <img
              src={assets.facebook_icon}
              alt="facebook_icon"
              className="w-6 h-6" // Thêm kích thước
            />
          </a>
          <a href="https://www.instagram.com/hanzomudashi/">
            <img
              src={assets.instagram_icon}
              alt="instagram_icon"
              className="w-6 h-6" // Thêm kích thước
            />
          </a>
        </div> */}
        <a className="w-20" href="https://www.facebook.com/gk123a">
          <img
          
          src="https://cdn-icons-png.flaticon.com/512/733/733547.png"
          alt="facebook"
          className="w-6 h-6"
        />
        </a>
        
      </div>

      <p className="py-4 mt-6 text-center text-xs md:text-sm text-white">
        Copyright 2025 @ kiendotri
      </p>
    </footer>
  );
};

export default Footer;
