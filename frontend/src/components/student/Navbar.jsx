// import React, { useContext } from "react";
// import { assets } from "../../assets/assets";
// import { Link, NavLink } from "react-router-dom";
// import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
// import { AppContext } from "../../context/AppContext";
// import { toast } from "react-toastify";
// import axios from "axios";

// const Navbar = () => {
//   const { navigate, isEducator, backendUrl, setIsEducator, getToken } =
//     useContext(AppContext);
//   const { openSignIn } = useClerk();
//   const { user } = useUser();
//   const isCouseListPage = location.pathname.includes("/course-list");
//   const userRole = user?.publicMetadata?.role;

//   const becomeEducator = async () => {
//     try {
//       if (isEducator) {
//         navigate("/educator");
//         return;
//       }

//       const token = await getToken();
//       const { data } = await axios.get(
//         backendUrl + "/api/educator/update-role",
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       if (data.success) {
//         setIsEducator(true);
//         toast.success(data.message);
//       } else {
//         toast.error(data.message);
//       }
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   return (
//     // <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 bg-white-700`}>
//     <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-900 py-3">
//       <img
//         onClick={() => navigate("/")}
//         src={assets.logo}
//         alt="Logo"
//         className="w-12 lg:w-16 cursor-pointer"
//       />
//       <ul className="hidden md:flex items-center gap-5 font-medium">
//         {[
//           { name: "Home", path: "/" },
//           { name: "About", path: "/about" },
//         ].map(({ name, path }) => (
//           <NavLink
//             key={name}
//             to={path}
//             className={({ isActive }) =>
//               `relative px-3 py-1 transition-colors duration-200 ${
//                 isActive
//                   ? "text-indigo-600 font-semibold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/5 after:h-[2px] after:bg-indigo-600 after:rounded"
//                   : "text-gray-600 hover:text-indigo-600"
//               }`
//             }
//           >
//             {name}
//           </NavLink>
//         ))}
//       </ul>

//       {/* Desktop */}
//       <div className="hidden md:flex items-center gap-5 text-gray-900">
//         <div className="flex items-center gap-5">
//           {user && (
//             <>
//               {/* {userRole !== "student" && (
//                 <button onClick={becomeEducator}>
//                   {isEducator ? "Educator Dashboard" : "Become Educator"}
//                 </button>
//               )} */}
//               {userRole == "educator" && (
//                 <button onClick={becomeEducator}>
//                   {"Educator Dashboard"}
//                 </button>
//               )}
//               |<Link to="/my-enrollments">My Enrollments</Link>
//             </>
//           )}
//         </div>
//         {user ? (
//           <UserButton />
//         ) : (
//           <button
//             onClick={() => openSignIn()}
//             className="bg-blue-600 text-white px-5 py-2 rounded-full"
//           >
//             Create Account
//           </button>
//         )}
//       </div>

//       {/* Mobile */}
//       <div className="md:hidden flex items-center gap-2 sm:gap-5 text-gray-500">
//         <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
//           {user && (
//             <>
//               {/* {userRole !== "student" && (
//                 <button onClick={becomeEducator}>
//                   {isEducator ? "Educator Dashboard" : "Become Educator"}
//                 </button>
//               )} */}
//               {userRole == "educator" && (
//                 <button onClick={becomeEducator}>
//                   {"Educator Dashboard"}
//                 </button>
//               )}
//               |<Link to="/my-enrollments">My Enrollments</Link>
//             </>
//           )}
//         </div>
//         {user ? (
//           <UserButton />
//         ) : (
//           <button onClick={() => openSignIn()}>
//             <img src={assets.user_icon} alt="" />
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Navbar;
import React, { useContext, useState } from "react";
import { assets } from "../../assets/assets";
import { Link, NavLink } from "react-router-dom";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";

const Navbar = () => {
  const { navigate, isEducator, backendUrl, setIsEducator, getToken } =
    useContext(AppContext);
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role;
  const [menuOpen, setMenuOpen] = useState(false);

  const becomeEducator = async () => {
    try {
      if (isEducator) {
        navigate("/educator");
        return;
      }

      const token = await getToken();
      const { data } = await axios.get(
        backendUrl + "/api/educator/update-role",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        setIsEducator(true);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-900 py-3">
        <img
          onClick={() => navigate("/")}
          src={assets.logo}
          alt="Logo"
          className="w-12 lg:w-16 cursor-pointer"
        />

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-5 font-medium">
          {[
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ].map(({ name, path }) => (
            <NavLink
              key={name}
              to={path}
              className={({ isActive }) =>
                `relative px-3 py-1 transition-colors duration-200 ${
                  isActive
                    ? "text-indigo-600 font-semibold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/5 after:h-[2px] after:bg-indigo-600 after:rounded"
                    : "text-gray-600 hover:text-indigo-600"
                }`
              }
            >
              {name}
            </NavLink>
          ))}
        </ul>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-5 text-gray-900">
          <div className="flex items-center gap-5">
            {user && (
              <>
                {userRole === "educator" && (
                  <button onClick={becomeEducator}>Educator Dashboard</button>
                )}
                |<Link to="/my-enrollments">My Enrollments</Link>
              </>
            )}
          </div>
          {user ? (
            <UserButton />
          ) : (
            <button
              onClick={() => openSignIn()}
              className="bg-blue-600 text-white px-5 py-2 rounded-full"
            >
              Create Account
            </button>
          )}
        </div>

        {/* Mobile Right Section + Hamburger */}
        <div className="md:hidden flex items-center gap-3 text-gray-500">
          {user ? (
            <UserButton />
          ) : (
            <button onClick={() => openSignIn()}>
              <img src={assets.user_icon} alt="" className="w-6 h-6" />
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-md flex flex-col items-start p-4 z-50">
          {[
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ].map(({ name, path }) => (
            <NavLink
              key={name}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `w-full py-2 px-4 text-left ${
                  isActive ? "text-indigo-600 font-semibold" : "text-gray-700"
                }`
              }
            >
              {name}
            </NavLink>
          ))}

          <div className="mt-4 text-gray-800 text-sm">
            {user && (
              <div className="mb-2">
                {userRole === "educator" && (
                  <button onClick={becomeEducator} className="block mb-2">
                    Educator Dashboard
                  </button>
                )}
                <Link to="/my-enrollments" onClick={() => setMenuOpen(false)}>
                  My Enrollments
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
