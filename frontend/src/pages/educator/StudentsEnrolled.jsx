// import React, { useContext, useEffect, useState } from "react";
// import { dummyStudentEnrolled } from "../../assets/assets";
// import Loading from "../../components/student/Loading";
// import { AppContext } from "../../context/AppContext";
// import { toast } from "react-toastify";
// import axios from "axios";

// const StudentsEnrolled = () => {
//   const { backendUrl, getToken, isEducator } = useContext(AppContext);
//   const [enrolledStudents, setEnrolledStudents] = useState(null);

//   const fetchEnrolledStudents = async () => {
//     try {
//       const token = await getToken();
//       const { data } = await axios.get(
//         backendUrl + "/api/educator/enrolled-students",
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       if (data.success) {
//         setEnrolledStudents(data.enrolledStudents.reverse());
//       } else {
//         toast.error(data.message);
//       }
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   useEffect(() => {
//     if (isEducator) {
//       fetchEnrolledStudents();
//     }
//   }, [isEducator]);
//   return enrolledStudents ? (
//     <div className="min-h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
//       <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
//         <table className="table-fixed md:table-auto w-full overflow-hidden pb-4">
//           <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
//             <tr>
//               <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">
//                 #
//               </th>
//               <th className="px-4 py-3 font-semibold">Student Name</th>
//               <th className="px-4 py-3 font-semibold">Student Mail</th>
//               <th className="px-4 py-3 font-semibold">Course Title</th>
//               <th className="px-4 py-3 font-semibold hidden sm:table-cell">
//                 Enrolled Date
//               </th>
//             </tr>
//           </thead>
//           <tbody className="text-sm text-gray-600">
//             {enrolledStudents.map((item, index) => (
//               <tr key={index} className="border-b border-gray-500/20">
//                 <td className="px-4 py-3 text-center hidden sm:table-cell">
//                   {index + 1}
//                 </td>
//                 <td className="md:px-4 px-2 py-3 flex items-center space-x-3">
//                   <img
//                     src={item.student.imageUrl}
//                     alt=""
//                     className="w-9 h-9 rounded-full"
//                   />
//                   <span className="truncate">{item.student.name}</span>
//                 </td>
//                 <td className="px-4 py-3">{item.student.email}</td> 
//                 <td className="px-4 py-3 truncate">{item.courseTitle}</td>
//                 <td className="px-4 py-3 hidden sm:table-cell">
//                   {new Date(item.purchaseDate).toLocaleDateString()}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   ) : (
//     <Loading />
//   );
// };

// export default StudentsEnrolled;

import React, { useContext, useEffect, useState, useMemo } from "react";
import Loading from "../../components/student/Loading";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import * as XLSX from "xlsx";

const StudentsEnrolled = () => {
  const { backendUrl, getToken, isEducator } = useContext(AppContext);
  const [enrolledStudents, setEnrolledStudents] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchEnrolledStudents = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(
        backendUrl + "/api/educator/enrolled-students",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setEnrolledStudents(data.enrolledStudents.reverse());
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (isEducator) fetchEnrolledStudents();
  }, [isEducator]);

  const filtered = useMemo(() => {
    if (!enrolledStudents) return [];
    return enrolledStudents.filter(item => {
      const nameMatch = item.student.name
        .toLowerCase()
        .includes(searchName.toLowerCase().trim());
      let dateMatch = true;
      if (startDate) {
        dateMatch = new Date(item.purchaseDate) >= new Date(startDate);
      }
      if (endDate && dateMatch) {
        dateMatch = new Date(item.purchaseDate) <= new Date(endDate);
      }
      return nameMatch && dateMatch;
    });
  }, [enrolledStudents, searchName, startDate, endDate]);

  const exportExcel = () => {
    const data = filtered.map((item, i) => ({
      "#": i + 1,
      Name: item.student.name,
      Email: item.student.email,
      Course: item.courseTitle,
      Date: new Date(item.purchaseDate).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enrolled");
    XLSX.writeFile(wb, "Enrolled_Students.xlsx");
  };

  if (!enrolledStudents) return <Loading />;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="font-medium">Tên:</label>
          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="ml-2 border p-1 rounded"
            placeholder="Tìm theo tên..."
          />
        </div>
        <div>
          <label className="font-medium">Từ ngày:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="ml-2 border p-1 rounded"
          />
        </div>
        <div>
          <label className="font-medium">Đến ngày:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="ml-2 border p-1 rounded"
          />
        </div>
        <button
          onClick={exportExcel}
          className="ml-auto bg-blue-500 text-white px-4 py-2 rounded"
        >
          Xuất Excel
        </button>
      </div>

      <div className="overflow-x-auto bg-white border rounded-md">
        <table className="w-full table-fixed text-gray-700 text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 w-12 text-center">#</th>
              <th className="px-4 py-2">Tên</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Khóa học</th>
              <th className="px-4 py-2">Ngày ghi danh</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-2 text-center">{idx + 1}</td>
                <td className="px-4 py-2 flex items-center space-x-2">
                  <img
                    src={item.student.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{item.student.name}</span>
                </td>
                <td className="px-4 py-2">{item.student.email}</td>
                <td className="px-4 py-2">{item.courseTitle}</td>
                <td className="px-4 py-2">
                  {new Date(item.purchaseDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentsEnrolled;
