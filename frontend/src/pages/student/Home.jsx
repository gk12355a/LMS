import React from 'react'
import Hero from '../../components/student/Hero'
import Companies from '../../components/student/Companies'
import CourseSection from '../../components/student/CourseSection'
import TestimonialsSection from '../../components/student/TestimonialsSection'
import Footer from '../../components/student/Footer'
const Home = () => {
  return (
    <div>
        <h1 className='flex flex-col items-center space-y-7 text-center'>
          <Hero/>
        
          <Companies/>
          <CourseSection/>
          <TestimonialsSection/>
          <Footer/>
        </h1>
    </div>
  )
}

export default Home