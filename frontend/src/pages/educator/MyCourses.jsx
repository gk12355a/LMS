import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import { toast } from "react-toastify";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Quill from "quill";

const MyCourses = () => {
  const thumbnailInputRef = useRef(null);
  const [newThumbnail, setNewThumbnail] = useState(null);
  const { currency, backendUrl, getToken, isEducator } = useContext(AppContext);
  const [courses, setCourses] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [chapters, setChapters] = useState([]);
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  // Fetch educator's courses
  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCourses(data.courses);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete course
  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const { data } = await axios.delete(`${backendUrl}/api/course/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success(data.message);
        fetchEducatorCourses();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Open edit popup
  const handleEdit = (course) => {
    setEditCourse(course);
    setChapters(course.courseContent || []);
    setShowPopup(true);
    setTimeout(() => {
      if (!quillRef.current && editorRef.current) {
        quillRef.current = new Quill(editorRef.current, { theme: "snow" });
        quillRef.current.root.innerHTML = course.courseDescription;
      }
    }, 200);
  };

  // Add new empty chapter
  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      {
        chapterId: uuidv4(),
        chapterTitle: "",
        chapterOrder: prev.length + 1,
        chapterContent: [],
      },
    ]);
  };

  // Remove a chapter
  const removeChapter = (chapterId) => {
    setChapters((prev) => prev.filter((c) => c.chapterId !== chapterId));
  };

  // Update chapter title
  const updateChapterTitle = (chapterId, title) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.chapterId === chapterId ? { ...c, chapterTitle: title } : c
      )
    );
  };

  const addLecture = (chapterId) => {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.chapterId !== chapterId) return c;

        const newLecture = {
          lectureId: uuidv4(),
          lectureTitle: "",
          lectureDuration: "",
          lectureUrl: "",
          isPreviewFree: false,
          lectureOrder: (c.chapterContent?.length || 0) + 1,
        };

        return {
          ...c,
          chapterContent: [...c.chapterContent, newLecture],
        };
      })
    );
  };

  // Remove a lecture
  const removeLecture = (chapterId, lectureId) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.chapterId === chapterId
          ? {
              ...c,
              chapterContent: c.chapterContent.filter(
                (l) => l.lectureId !== lectureId
              ),
            }
          : c
      )
    );
  };

  // Update a lecture field
  const updateLectureField = (chapterId, lectureId, field, value) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.chapterId === chapterId
          ? {
              ...c,
              chapterContent: c.chapterContent.map((l) =>
                l.lectureId === lectureId ? { ...l, [field]: value } : l
              ),
            }
          : c
      )
    );
  };

  // Submit edits
  const updateCourse = async () => {
    try {
      const token = await getToken();
      const payload = {
        courseTitle: editCourse.courseTitle,
        courseDescription: quillRef.current.root.innerHTML,
        coursePrice: editCourse.coursePrice,
        discount: editCourse.discount,
        courseContent: chapters,
      };

      const { data } = await axios.put(
        `${backendUrl}/api/educator/courses/${editCourse._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setShowPopup(false);
        fetchEducatorCourses();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (isEducator) fetchEducatorCourses();
  }, [isEducator]);

  if (!courses) return <Loading />;

  return (
    <div className="h-full p-6">
      <h2 className="text-xl font-bold mb-4">My Courses</h2>
      <table className="w-full text-left border bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Course</th>
            <th className="p-2">Earnings</th>
            <th className="p-2">Students</th>
            <th className="p-2">Published</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c._id} className="border-t">
              <td className="p-2 flex items-center gap-2">
                {c.courseThumbnail && (
                  <img
                    src={c.courseThumbnail}
                    alt=""
                    className="w-14 h-10 object-cover"
                  />
                )}
                {c.courseTitle}
              </td>
              <td className="p-2">
                {currency}
                {Math.floor(
                  c.enrolledStudents.length *
                    c.coursePrice *
                    (1 - c.discount / 100)
                )}
              </td>
              <td className="p-2">{c.enrolledStudents.length}</td>
              <td className="p-2">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleEdit(c)}
                  className="text-blue-600 mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Popup Add/Edit */}
      {showPopup && editCourse && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl mb-4">Edit Course</h3>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Title</label>
                <input
                  className="w-full px-2 py-1 border rounded"
                  value={editCourse.courseTitle}
                  onChange={(e) =>
                    setEditCourse({
                      ...editCourse,
                      courseTitle: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label>Price</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 border rounded"
                  value={editCourse.coursePrice}
                  onChange={(e) =>
                    setEditCourse({
                      ...editCourse,
                      coursePrice: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label>Discount %</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 border rounded"
                  value={editCourse.discount}
                  onChange={(e) =>
                    setEditCourse({
                      ...editCourse,
                      discount: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <label>Description</label>
                <div
                  ref={editorRef}
                  className="border rounded p-2 min-h-[150px]"
                ></div>
              </div>
              <div className="col-span-2">
                <label>Thumbnail</label>
                <div className="flex items-center gap-4 mt-2">
                  {newThumbnail ? (
                    <img
                      src={URL.createObjectURL(newThumbnail)}
                      alt="New thumbnail"
                      className="w-32 h-20 object-cover border"
                    />
                  ) : (
                    editCourse.courseThumbnail && (
                      <img
                        src={editCourse.courseThumbnail}
                        alt="Current thumbnail"
                        className="w-32 h-20 object-cover border"
                      />
                    )
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={thumbnailInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setNewThumbnail(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="px-3 py-1 bg-blue-500 text-white rounded"
                    >
                      Change Thumbnail
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter & Lecture Management */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg">Chapters</h4>
                <button
                  onClick={addChapter}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  + Add Chapter
                </button>
              </div>
              {chapters.map((ch) => (
                <div
                  key={ch.chapterId}
                  className="border p-3 rounded mb-3 bg-gray-50"
                >
                  <div className="flex justify-between mb-2">
                    <input
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="Chapter title..."
                      value={ch.chapterTitle}
                      onChange={(e) =>
                        updateChapterTitle(ch.chapterId, e.target.value)
                      }
                    />
                    <button
                      onClick={() => removeChapter(ch.chapterId)}
                      className="text-red-600 ml-2"
                    >
                      Delete Chapter
                    </button>
                  </div>

                  {/* Lectures */}
                  {ch.chapterContent.map((lec) => (
                    <div
                      key={lec.lectureId}
                      className="flex items-center gap-2 mb-2"
                    >
                      <input
                        className="px-2 py-1 border rounded flex-1"
                        placeholder="Lecture title"
                        value={lec.lectureTitle}
                        onChange={(e) =>
                          updateLectureField(
                            ch.chapterId,
                            lec.lectureId,
                            "lectureTitle",
                            e.target.value
                          )
                        }
                      />
                      <input
                        className="px-2 py-1 border rounded w-20"
                        placeholder="Duration"
                        value={lec.lectureDuration}
                        onChange={(e) =>
                          updateLectureField(
                            ch.chapterId,
                            lec.lectureId,
                            "lectureDuration",
                            e.target.value
                          )
                        }
                      />
                      <input
                        className="px-2 py-1 border rounded flex-1"
                        placeholder="Video URL"
                        value={lec.lectureUrl}
                        onChange={(e) =>
                          updateLectureField(
                            ch.chapterId,
                            lec.lectureId,
                            "lectureUrl",
                            e.target.value
                          )
                        }
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={lec.isPreviewFree}
                          onChange={(e) =>
                            updateLectureField(
                              ch.chapterId,
                              lec.lectureId,
                              "isPreviewFree",
                              e.target.checked
                            )
                          }
                        />{" "}
                        Free
                      </label>
                      <button
                        onClick={() =>
                          removeLecture(ch.chapterId, lec.lectureId)
                        }
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addLecture(ch.chapterId)}
                    className="text-blue-600"
                  >
                    + Add Lecture
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={updateCourse}
                className="px-6 py-2 bg-blue-600 text-white rounded"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
