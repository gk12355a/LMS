// import React, { useContext } from 'react'
// import { assets } from '../../assets/assets'
// import { Link } from 'react-router-dom'
// import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
// import { AppContext } from '../../context/AppContext'
// import { toast } from 'react-toastify'
// import axios from 'axios'
// const Navbar = () => {
//   const {navigate, isEducator, backendUrl, setIsEducator, getToken} =useContext(AppContext)
//   const {openSignIn} = useClerk()
//   const {user} = useUser()
//   const isCouseListPage = location.pathname.includes('/course-list');
//   const becomeEducator = async () => {
//     try {
//       if (isEducator) {
//         navigate('/educator');
//         return;
//       }

//       const token = await getToken();
//       const { data } = await axios.get(backendUrl + '/api/educator/update-role', {
//         headers: { Authorization: `Bearer ${token}` }
//       });

//       if (data.success) {
//         setIsEducator(true);
//         toast.success(data.message);
//       } else{
//         toast.error(error.message)
//       }
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };
//   return (
//     <div className={`flex items center justify-between px-4 sm:px-10 md:px -14 lg:px-36 border-b border-gray-500 py-4 ${isCouseListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
//         <img onClick={()=> navigate('/')} src={assets.logo} alt='Logo' className='w-28 lg:w-32 cursor-pointer' />
//         <div className='hidden md:flex items-center gap-5 text-gray-500'>
//             <div className='flex items-center gap-5'>
//             { user &&
//                 <><button onClick={becomeEducator}>{isEducator ? 'Educator Dashboard' : 'Become Educator'}</button> |
//                  <Link to='/my-enrollments'>My Enrollments</Link></>}

//             </div>
//             { user ? <UserButton/> : <button onClick={()=> openSignIn()}className='bg-blue-600 text-white px-5 py-2 rounded-full'>Create Account</button>}

//         </div>
//         {/* {For phone screen} */}
//         <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
//              <div className='flex items-center gap-1 sm:gap-2 max-sm:text-xs'>
//              { user &&
//                 <><button onClick={becomeEducator}>{isEducator ? 'Educator Dashboard' : 'Become Educator'}</button> |
//                  <Link to='/my-enrollments'>My Enrollments</Link></>}
//              </div>
//              {
//                 user ? <UserButton/>
//                 : <button onClick={()=> openSignIn()}><img src={assets.user_icon} alt=""/></button>
//              }

//         </div>
//     </div>
//   )
// }

// export default Navbar
import React, { useContext } from "react";
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
  const isCouseListPage = location.pathname.includes("/course-list");
  const userRole = user?.publicMetadata?.role;

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
    // <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 bg-white-700`}>
    <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-900 py-3">
      <img
        onClick={() => navigate("/")}
        src={assets.logo}
        alt="Logo"
        className="w-12 lg:w-16 cursor-pointer"
      />
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

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-5 text-gray-900">
        <div className="flex items-center gap-5">
          {user && (
            <>
              {userRole !== "student" && (
                <button onClick={becomeEducator}>
                  {isEducator ? "Educator Dashboard" : "Become Educator"}
                </button>
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

      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 sm:gap-5 text-gray-500">
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          {user && (
            <>
              {userRole !== "student" && (
                <button onClick={becomeEducator}>
                  {isEducator ? "Educator Dashboard" : "Become Educator"}
                </button>
              )}
              |<Link to="/my-enrollments">My Enrollments</Link>
            </>
          )}
        </div>
        {user ? (
          <UserButton />
        ) : (
          <button onClick={() => openSignIn()}>
            <img src={assets.user_icon} alt="" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
