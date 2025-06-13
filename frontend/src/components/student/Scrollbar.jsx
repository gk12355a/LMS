import React from "react";

const Scrollbar = ({ children }) => {
  return (
    <div className="h-screen overflow-y-scroll custom-scrollbar">

      {children}
    </div>
  );
};

export default Scrollbar;
