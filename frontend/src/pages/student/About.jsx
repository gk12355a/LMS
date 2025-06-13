import React from 'react';

const About = () => {
  return (
    <div className="px-6 md:px-20">
      <div className='text-center text-2xl pt-10 text-gray-500'>
        <p>ABOUT <span className='text-gray-700 font-medium'>ME</span></p>
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-12'>
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-sm text-gray-600'>
          <p>
            Hello! I am <strong className='text-gray-800'>Do Tri Kien</strong>, a final-year student majoring in Information Technology at CMC University.
          </p>
          <p>
            I created this website with the purpose of sharing practical knowledge that I have learned and applied during my studies and self-research. I hope the articles and guides here will be helpful for those interested in the field of system engineering.
          </p>
          <b className='text-gray-900'>Content Goals</b>
          <p>
            I focus on topics related to:
          </p>
          <ul className='list-disc list-inside'>
            <li>Systems and infrastructure architecture</li>
            <li>DevOps and CI/CD pipeline</li>
            <li>Linux and Bash scripting</li>
            <li>Golang programming language</li>
            <li>Docker and Kubernetes</li>
            <li>Web server configuration (Nginx)</li>
            <li>Database design with High Availability (HA)</li>
            <li>Computer networking and system administration</li>
          </ul>
          <p>
            I look forward to receiving feedback, sharing, and discussions from everyone to grow together 💡
          </p>
        </div>
      </div>

      <div className='text-xl my-4'>
        <p>Highlighted <span className='text-gray-700 font-semibold'>Content</span></p>
      </div>

      <div className='flex flex-col md:flex-row mb-20'>
        {[
          ['Robust Systems', 'Solid foundational knowledge about operating systems and system architecture.'],
          ['Automation', 'CI/CD pipelines, scripted operational processes.'],
          ['Modern Deployment', 'Docker, Kubernetes.']
        ].map(([title, desc], i) => (
          <div key={i} className='border px-6 md:px-12 py-8 flex flex-col gap-4 text-[15px] hover:bg-amber-500 hover:text-white transition-all duration-300 text-gray-600 cursor-pointer'>
            <b>{title}</b>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;