import React, { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/student/Home";
import CourseList from "./pages/student/CourseList";
import CourseDetails from "./pages/student/CourseDetails";
import MyEnrollments from "./pages/student/MyEnrollments";
import Player from "./pages/student/Player";
import Loading from "./components/student/Loading";
import Educator from "./pages/educator/Educator";
import Dashboard from "./pages/educator/Dashboard";
import StudentsEnrolled from "./pages/educator/StudentsEnrolled";
import MyCourses from "./pages/educator/MyCourses";
import AddCourse from "./pages/educator/AddCourse";
import Navbar from "./components/student/Navbar";
import { useMatch } from "react-router-dom";
import "quill/dist/quill.snow.css";
import { ToastContainer, toast } from "react-toastify";
import About from "./pages/student/About";


const App = () => {
  const isEducatorRoute = useMatch("/educator/*");
  const [verified, setVerified] = useState(false);
  const widgetRef = useRef(null);

  useEffect(() => {
    // Only show Turnstile on homepage (/) and not educator route
    if (!isEducatorRoute && window.turnstile && !verified) {
      window.turnstile.render(widgetRef.current, {
        sitekey: "YOUR_SITE_KEY", // Thay bằng site key thực tế của bạn
        callback: async function (token) {
          try {
            const res = await fetch("/api/user/verify-turnstile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (data.success) {
              setVerified(true);
            } else {
              toast.error("Xác thực bot thất bại!");
            }
          } catch (err) {
            toast.error("Lỗi xác thực bot!");
          }
        },
      });
    }
  }, [isEducatorRoute, verified]);

  // Hiển thị widget xác thực ở trang chủ, ẩn nội dung cho đến khi xác thực xong
  if (!isEducatorRoute && window.location.pathname === "/" && !verified) {
    return <div ref={widgetRef} style={{ marginTop: 100, display: "flex", justifyContent: "center" }} />;
  }

  return (
    <div className="text-default min-h-screen  bg-gradient-to-b from-stone-200/70">
      <ToastContainer />
      {!isEducatorRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course-list" element={<CourseList />} />
        <Route path="/course-list/:input" element={<CourseList />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/my-enrollments" element={<MyEnrollments />} />
        <Route path="/player/:courseId" element={<Player />} />
        <Route path="/loading/:path" element={<Loading />} />
        <Route path="/about" element={<About />} />
        <Route path="/educator" element={<Educator />}>
          <Route path="/educator" element={<Dashboard />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="add-course" element={<AddCourse />} />
          <Route path="student-enrolled" element={<StudentsEnrolled />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
