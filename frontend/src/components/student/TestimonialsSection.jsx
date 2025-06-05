import React from "react";
import { dummyTestimonial } from "../../assets/assets";
import { assets } from "../../assets/assets";

const TestimonialsSection = () => {
  return (
    <div className="pb-4 px-4 md:px-0 md:pb-14 max-w-7xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-medium text-gray-800">Testimonials</h2>
      <p className="text-sm md:text-base text-gray-500 mt-2 md:mt-3">
        Hear from our learners as they share their journeys of transformation, success, and how our <br className="hidden md:block" /> platform
        has made a difference in their lives.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 mt-6 md:mt-14">
        {dummyTestimonial.map((testimonial, index) => (
          <div
            key={index}
            className="text-sm border border-gray-500/30 pb-4 md:pb-6 rounded-lg bg-white shadow-[0px_4px_15px_0px] shadow-black/5 overflow-hidden max-w-xs"
          >
            <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-2 md:py-4 bg-gray-500/10">
              <img
                className="h-10 md:h-12 w-10 md:w-12 rounded-full"
                src={testimonial.image}
                alt={testimonial.name}
              />
              <div>
                <h1 className="text-base md:text-lg font-medium text-gray-800">{testimonial.name}</h1>
                <p className="text-gray-800/80 text-xs md:text-sm">{testimonial.role}</p>
              </div>
            </div>
            <div className="p-3 md:p-5 pb-4 md:pb-7">
              <div className="flex gap-1 md:gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <img
                    className="h-4 md:h-5"
                    key={i}
                    src={i < Math.floor(testimonial.rating) ? assets.star : assets.star_blank}
                    alt="star"
                  />
                ))}
              </div>
              <p className="text-gray-500 mt-2 md:mt-5 text-xs md:text-sm">{testimonial.feedback}</p>
              <a href="#" className="text-blue-500 underline px-2 md:px-5 text-xs md:text-sm">Read more</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestimonialsSection;