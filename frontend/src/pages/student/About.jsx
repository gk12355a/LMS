import React from "react";
import { CheckCircle, ChevronRight } from "lucide-react";
import { assets } from "../../assets/assets";
import Footer from "../../components/student/Footer";

const About = () => {
  return (
    <>
      <section
        id="about"
        className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row items-center justify-center gap-10 px-6 md:px-20 py-16"
      >
        {/* Image */}
        <img
          src={assets.CMC}
          alt="profile"
          className="w-72 md:w-96 rounded-xl shadow-lg shadow-cyan-500/30 hover:scale-105 transition duration-300"
        />

        {/* About content */}
        <div className="flex flex-col gap-8 max-w-2xl">
          <div>
            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">
                About Me
              </span>
            </h1>
            <p className="opacity-80 leading-relaxed">
              I am <span className="font-semibold">Do Tri Kien</span>, a final-year IT student at CMC University
              with strong interests in cloud computing, automation, and system
              architecture. My goal is to grow into a <b>DevOps Engineer</b>,
              leveraging skills in CI/CD, scripting, containerization, and
              cloud technologies to build scalable and secure infrastructures.
            </p>
          </div>
          {/* My CV button */}
          <div>
            <a
              href="https://www.topcv.vn/xem-cv/BQdaDQxWVV4LDgEHBAMGUAFbVwcBAQJaCFUDWw5f86"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-6 px-6 py-3 border-2 border-white rounded-lg text-lg font-medium hover:bg-white hover:text-gray-900 transition"
            >
              My CV
            </a>
          </div>

          {/* Skills */}
          <div>
            <h2 className="text-3xl font-semibold mb-4">Skills</h2>
            <div className="grid grid-cols-2 gap-6 text-gray-300">
              <ul className="space-y-3">
                {[
                  "English (Good at Reading)",
                  "Hypervisor: VMware Workstation, Proxmox",
                  "Terminal: Bash Scripting, Vim",
                  "IaC: Ansible",
                  "Containerization: Docker, Kubernetes",
                  "CI/CD: GitLab CI, Jenkins, Argo CD (GitOps)",
                ].map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 hover:translate-x-2 transition">
                    <ChevronRight className="w-5 h-5 text-cyan-400" /> {skill}
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                {[
                  "Cloud: AWS",
                  "Repository: DockerHub, Portus",
                  "Web Server: Nginx, Tomcat",
                  "Security: Snyk, Trivy, Climatecode, Arachni, AppArmor",
                  "Monitoring: Prometheus, Grafana",
                ].map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 hover:translate-x-2 transition">
                    <ChevronRight className="w-5 h-5 text-cyan-400" /> {skill}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h2 className="text-3xl font-semibold mb-4">Certifications</h2>
            <ul className="space-y-3 text-gray-300">
              {[
                [
                  "Troubleshooting and Debugging Techniques",
                  "https://www.coursera.org/account/accomplishments/certificate/BEWCADHHMSU8",
                ],
                [
                  "Configuration Management and the Cloud",
                  "https://www.coursera.org/account/accomplishments/certificate/2LMBLPJ6XXWN",
                ],
                [
                  "Crash Course on Python",
                  "https://www.coursera.org/account/accomplishments/certificate/RU6VS4D8GXYM",
                ],
                [
                  "DevOps for Fresher",
                  "https://devopsedu.vn/chung-chi-gia-su-2/?cert_hash=c5f4be43d2b10baf",
                ],
                [
                  "DevOps for Business",
                  "https://devopsedu.vn/chung-chi-gia-su-2/?cert_hash=75f5af1a416ebf79",
                ],
              ].map(([title, link], i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-cyan-400"
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          
        </div>
      </section>
      <Footer />
    </>
  );
};

export default About;
