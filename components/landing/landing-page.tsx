'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const primary = '#7367F0'

export default function LandingPage() {
  const router = useRouter()
  const [expandedFaq, setExpandedFaq] = useState(-1)
  const [pricingPeriod, setPricingPeriod] = useState('monthly')
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)

  const handlePricingButtonClick = (planName: string) => {
    if (planName === 'Enterprise') {
      // For enterprise, scroll to contact form
      document.getElementById('landingContact')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      // For other plans, go to login/signup
      router.push('/login')
    }
  }

  const handleFormSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      // Call your API endpoint to handle the form submission
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        alert('Thank you! We will get back to you soon.')
        setFormData({ name: '', email: '', message: '' })
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      alert('Error sending message. Please try again.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleFormChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .landing-hero {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%);
          min-height: 600px;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .hero-animation-img {
          animation: slideInUp 1s ease-out;
        }
        .section-py { padding: 80px 0; }
        .mb-12 { margin-bottom: 3rem; }
        .team-image-box {
          min-height: 300px;
        }
        .pricing-card-featured {
          transform: scale(1.05);
          position: relative;
        }
        .pricing-badge {
          position: absolute;
          top: -16px;
          left: 20px;
          background: ${primary};
          color: #fff;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }
      `}</style>

      {/* Navigation */}
      <nav className="layout-navbar shadow-none py-0">
        <div className="container">
          <div className="navbar navbar-expand-lg landing-navbar px-3 px-md-8">
            <div className="navbar-brand app-brand demo d-flex py-0 me-4 me-xl-8 ms-0">
              <button
                className="navbar-toggler border-0 px-0 me-4"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation">
                <i className="icon-base ti tabler-menu-2 icon-lg align-middle text-heading fw-medium"></i>
              </button>
              <Link href="/" className="app-brand-link">
                <span className="app-brand-logo demo">
                  <span style={{ color: primary, fontWeight: 700, fontSize: '1.5rem' }}>LedX</span>
                </span>
                <span className="app-brand-text demo fw-bold ms-3" style={{ color: '#0f172a' }}>eLearning</span>
              </Link>
            </div>

            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav ms-auto align-items-lg-center">
                <li className="nav-item">
                  <a className="nav-link fw-medium" href="#landingHero">Home</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-medium" href="#landingFeatures">Features</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-medium" href="#landingTeam">Team</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-medium" href="#landingFAQ">FAQ</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-medium" href="#landingPricing">Pricing</a>
                </li>
                <li className="nav-item">
                  <Link href="/login" className="btn btn-primary btn-sm ms-3">Get Early Access</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero-animation">
        <div id="landingHero" className="section-py landing-hero position-relative" style={{
          backgroundImage: `url('/images/front-pages/backgrounds/hero-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="container">
            <div className="hero-text-box text-center position-relative">
              <h1 className="text-primary hero-title display-6 fw-extrabold">
                Empower Your Team with Enterprise Learning
              </h1>
              <h2 className="hero-sub-title h6 mb-6">
                A comprehensive Learning Management System<br className="d-none d-lg-block" />
                designed for modern enterprises.
              </h2>
              <div className="landing-hero-btn d-inline-block position-relative">
                <span className="hero-btn-item position-absolute d-none d-md-flex fw-medium" style={{ left: '-200px', top: '-30px' }}>
                  Join community
                </span>
                <Link href="#landingPricing" className="btn btn-primary btn-lg">Get early access</Link>
              </div>
            </div>
            <div id="heroDashboardAnimation" className="hero-animation-img">
              <a href="#landingFeatures">
                <div id="heroAnimationImg" className="position-relative hero-dashboard-img">
                  <img
                    src="/images/Mockups/stdDash.png"
                    alt="hero dashboard"
                    style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                  />
                  <img
                    src="/images/front-pages/landing-page/hero-elements-light.png"
                    alt="hero elements"
                    style={{ position: 'absolute', top: 0, left: 0, maxWidth: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </a>
            </div>
          </div>
        </div>
        <div className="landing-hero-blank"></div>
      </section>

      {/* Features Section */}
      <section id="landingFeatures" className="section-py landing-features">
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge bg-label-primary">Useful Features</span>
          </div>
          <h4 className="text-center mb-1">
            <span className="position-relative fw-extrabold z-1">
              Everything you need
            </span>
            for effective learning management
          </h4>
          <p className="text-center mb-12">
            Comprehensive tools and features designed to deliver engaging learning experiences and measurable outcomes.
          </p>

          <div className="features-icon-wrapper row gx-0 gy-6 g-sm-12">
            {[
              {
                title: 'Live Interactive Classes',
                desc: 'Real-time virtual classrooms with recording, allowing tutors to engage students live and build community.',
                svg: (
                  <svg width="64" height="65" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" d="M10 44.4663V18.4663C10 17.4054 10.4214 16.388 11.1716 15.6379C11.9217 14.8877 12.9391 14.4663 14 14.4663H50C51.0609 14.4663 52.0783 14.8877 52.8284 15.6379C53.5786 16.388 54 17.4054 54 18.4663V44.4663H10Z" fill="currentColor" />
                    <path d="M10 44.4663V18.4663C10 17.4054 10.4214 16.388 11.1716 15.6379C11.9217 14.8877 12.9391 14.4663 14 14.4663H50C51.0609 14.4663 52.0783 14.8877 52.8284 15.6379C53.5786 16.388 54 17.4054 54 18.4663V44.4663M36 22.4663H28M6 44.4663H58V48.4663C58 49.5272 57.5786 50.5446 56.8284 51.2947C56.0783 52.0449 55.0609 52.4663 54 52.4663H10C8.93913 52.4663 7.92172 52.0449 7.17157 51.2947C6.42143 50.5446 6 49.5272 6 48.4663V44.4663Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                title: 'Assessment Suite',
                desc: 'Comprehensive quizzes, assignments, and certifications with automatic grading and progress tracking.',
                svg: (
                  <svg width="64" height="65" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" d="M13.625 50.8413C11.325 48.5413 12.85 43.7163 11.675 40.8913C10.5 38.0663 6 35.5913 6 32.4663C6 29.3413 10.45 26.9663 11.675 24.0413C12.9 21.1163 11.325 16.3913 13.625 14.0913C15.925 11.7913 20.75 13.3163 23.575 12.1413C26.4 10.9663 28.875 6.46631 32 6.46631C35.125 6.46631 37.5 10.9163 40.425 12.1413C43.35 13.3663 48.075 11.7913 50.375 14.0913C52.675 16.3913 51.15 21.2163 52.325 24.0413C53.5 26.8663 58 29.3413 58 32.4663C58 35.5913 53.55 37.9663 52.325 40.8913C51.1 43.8163 52.675 48.5413 50.375 50.8413C48.075 53.1413 43.25 51.6163 40.425 52.7913C37.6 53.9663 35.125 58.4663 32 58.4663C28.875 58.4663 26.5 54.0163 23.575 52.7913C20.65 51.5663 15.925 53.1413 13.625 50.8413Z" fill="currentColor" />
                    <path d="M43 26.4663L28.325 40.4663L21 33.4663M13.625 50.8413C11.325 48.5413 12.85 43.7163 11.675 40.8913C10.5 38.0663 6 35.5913 6 32.4663C6 29.3413 10.45 26.9663 11.675 24.0413C12.9 21.1163 11.325 16.3913 13.625 14.0913C15.925 11.7913 20.75 13.3163 23.575 12.1413C26.4 10.9663 28.875 6.46631 32 6.46631C35.125 6.46631 37.5 10.9163 40.425 12.1413C43.35 13.3663 48.075 11.7913 50.375 14.0913C52.675 16.3913 51.15 21.2163 52.325 24.0413C53.5 26.8663 58 29.3413 58 32.4663C58 35.5913 53.55 37.9663 52.325 40.8913C51.1 43.8163 52.675 48.5413 50.375 50.8413C48.075 53.1413 43.25 51.6163 40.425 52.7913C37.6 53.9663 35.125 58.4663 32 58.4663C28.875 58.4663 26.5 54.0163 23.575 52.7913C20.65 51.5663 15.925 53.1413 13.625 50.8413Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                title: 'Doubt Resolution Forum',
                desc: 'Interactive Q&A system where students ask questions and tutors provide answers in real-time.',
                svg: (
                  <svg width="64" height="65" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" fillRule="evenodd" clipRule="evenodd" d="M52.8934 36.9867L45.1661 27.709C45.4614 33.3937 44.0587 40.0137 39.7274 47.5687L47.1102 53.475C47.3728 53.6835 47.6842 53.8215 48.0149 53.8759C48.3457 53.9303 48.6849 53.8994 49.0004 53.786C49.3159 53.6726 49.5972 53.4806 49.8177 53.228C50.0381 52.9755 50.1905 52.6709 50.2602 52.343L53.2872 38.6602C53.3602 38.3701 53.3625 38.0667 53.294 37.7755C53.2255 37.4843 53.0881 37.2138 52.8934 36.9867ZM10.959 37.1344L18.6864 27.8813C18.3911 33.566 19.7938 40.1859 24.1251 47.7164L16.7422 53.6227C16.4814 53.8311 16.1718 53.9698 15.8426 54.0256C15.5134 54.0814 15.1754 54.0526 14.8604 53.9419C14.5453 53.8311 14.2637 53.6421 14.0418 53.3925C13.82 53.143 13.6653 52.8411 13.5922 52.5152L10.5653 38.8078C10.4923 38.5177 10.49 38.2144 10.5585 37.9232C10.627 37.632 10.7644 37.3615 10.959 37.1344Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M30.1373 4.56417C30.661 4.13034 31.3197 3.89282 31.9999 3.89282C32.6817 3.89282 33.3419 4.1314 33.8661 4.56708C36.2461 6.5048 41.3981 11.3124 44.2413 18.7028C45.231 21.2754 45.9359 24.1485 46.1526 27.3062L53.8054 36.4894C54.1015 36.8368 54.3105 37.2498 54.4151 37.6941C54.519 38.1357 54.5167 38.5956 54.4085 39.0361L51.3844 52.7309L51.3837 52.734C51.2735 53.2253 51.0402 53.6805 50.7057 54.0569C50.3712 54.4332 49.9465 54.7183 49.4715 54.8853C48.9964 55.0523 48.4867 55.0957 47.9903 55.0115C47.4939 54.9273 47.027 54.7182 46.6337 54.4039L46.6332 54.4035L39.5243 48.7164H24.4758L17.3669 54.4035L17.3665 54.4039C16.9731 54.7182 16.5062 54.9273 16.0098 55.0115C15.5134 55.0957 15.0037 55.0523 14.5287 54.8853C14.0537 54.7183 13.6289 54.4332 13.2944 54.0569C12.9599 53.6805 12.7266 53.2253 12.6165 52.734L12.6158 52.7309L9.59162 39.0361C9.48345 38.5957 9.48117 38.1358 9.58509 37.6941C9.68969 37.2496 9.89886 36.8364 10.1952 36.489L17.7037 27.4979C17.9004 24.2604 18.619 21.3188 19.6398 18.6906C22.5111 11.2981 27.7301 6.49122 30.1373 4.56417Z" fill="currentColor" />
                  </svg>
                )
              },
              {
                title: 'AI Practice Lab',
                desc: 'Scenario-based practice modules with AI-powered evaluation for case drafting, legal research, and more.',
                svg: (
                  <svg width="64" height="65" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" d="M31.9999 8.46631C27.1437 8.46489 22.4012 9.93672 18.399 12.6874C14.3969 15.438 11.3233 19.3381 9.58436 23.8723C7.84542 28.4066 7.52291 33.3617 8.65945 38.0831C9.79598 42.8045 12.3381 47.0701 15.9499 50.3163C17.4549 47.3526 19.7511 44.8636 22.5841 43.125C25.417 41.3864 28.676 40.4662 31.9999 40.4663C30.0221 40.4663 28.0887 39.8798 26.4442 38.781C24.7997 37.6822 23.518 36.1204 22.7611 34.2931C22.0043 32.4659 21.8062 30.4552 22.1921 28.5154C22.5779 26.5756 23.5303 24.7938 24.9289 23.3952C26.3274 21.9967 28.1092 21.0443 30.049 20.6585C31.9888 20.2726 33.9995 20.4706 35.8268 21.2275C37.654 21.9844 39.2158 23.2661 40.3146 24.9106C41.4135 26.5551 41.9999 28.4885 41.9999 30.4663C41.9999 33.1185 40.9464 35.662 39.071 37.5374C37.1956 39.4127 34.6521 40.4663 31.9999 40.4663C35.3238 40.4662 38.5829 41.3864 41.4158 43.125C44.2487 44.8636 46.545 47.3526 48.0499 50.3163C51.6618 47.0701 54.2039 42.8045 55.3404 38.0831C56.477 33.3617 56.1545 28.4066 54.4155 23.8723C52.6766 19.3381 49.603 15.438 45.6008 12.6874C41.5987 9.93672 36.8562 8.46489 31.9999 8.46631Z" fill="currentColor" />
                    <path d="M32 40.4663C37.5228 40.4663 42 35.9892 42 30.4663C42 24.9435 37.5228 20.4663 32 20.4663C26.4772 20.4663 22 24.9435 22 30.4663C22 35.9892 26.4772 40.4663 32 40.4663ZM32 40.4663C28.6759 40.4663 25.4168 41.3852 22.5839 43.1241C19.7509 44.863 17.4548 47.3524 15.95 50.3163M32 40.4663C35.3241 40.4663 38.5832 41.3852 41.4161 43.1241C44.2491 44.863 46.5452 47.3524 48.05 50.3163M56 32.4663C56 45.7211 45.2548 56.4663 32 56.4663C18.7452 56.4663 8 45.7211 8 32.4663C8 19.2115 18.7452 8.46631 32 8.46631C45.2548 8.46631 56 19.2115 56 32.4663Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                title: 'Video Learning',
                desc: 'High-quality video streaming powered by Mux with adaptive bitrate technology for seamless playback.',
                svg: (
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" fillRule="evenodd" clipRule="evenodd" d="M52.8934 36.9867L45.1661 27.709C45.4614 33.3937 44.0587 40.0137 39.7274 47.5687L47.1102 53.475C47.3728 53.6835 47.6842 53.8215 48.0149 53.8759C48.3457 53.9303 48.6849 53.8994 49.0004 53.786C49.3159 53.6726 49.5972 53.4806 49.8177 53.228C50.0381 52.9755 50.1905 52.6709 50.2602 52.343L53.2872 38.6602C53.3602 38.3701 53.3625 38.0667 53.294 37.7755C53.2255 37.4843 53.0881 37.2138 52.8934 36.9867ZM10.959 37.1344L18.6864 27.8813C18.3911 33.566 19.7938 40.1859 24.1251 47.7164L16.7422 53.6227C16.4814 53.8311 16.1718 53.9698 15.8426 54.0256C15.5134 54.0814 15.1754 54.0526 14.8604 53.9419C14.5453 53.8311 14.2637 53.6421 14.0418 53.3925C13.82 53.143 13.6653 52.8411 13.5922 52.5152L10.5653 38.8078C10.4923 38.5177 10.49 38.2144 10.5585 37.9232C10.627 37.632 10.7644 37.3615 10.959 37.1344Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M30.1373 4.56417C30.661 4.13034 31.3197 3.89282 31.9999 3.89282C32.6817 3.89282 33.3419 4.1314 33.8661 4.56708C36.2461 6.5048 41.3981 11.3124 44.2413 18.7028C45.231 21.2754 45.9359 24.1485 46.1526 27.3062L53.8054 36.4894C54.1015 36.8368 54.3105 37.2498 54.4151 37.6941C54.519 38.1357 54.5167 38.5956 54.4085 39.0361L51.3844 52.7309L51.3837 52.734C51.2735 53.2253 51.0402 53.6805 50.7057 54.0569C50.3712 54.4332 49.9465 54.7183 49.4715 54.8853C48.9964 55.0523 48.4867 55.0957 47.9903 55.0115C47.4939 54.9273 47.027 54.7182 46.6337 54.4039L46.6332 54.4035L39.5243 48.7164H24.4758L17.3669 54.4035L17.3665 54.4039C16.9731 54.7182 16.5062 54.9273 16.0098 55.0115C15.5134 55.0957 15.0037 55.0523 14.5287 54.8853C14.0537 54.7183 13.6289 54.4332 13.2944 54.0569C12.9599 53.6805 12.7266 53.2253 12.6165 52.734L12.6158 52.7309L9.59162 39.0361C9.48345 38.5957 9.48117 38.1358 9.58509 37.6941C9.68969 37.2496 9.89886 36.8364 10.1952 36.489L17.7037 27.4979C17.9004 24.2604 18.619 21.3188 19.6398 18.6906C22.5111 11.2981 27.7301 6.49122 30.1373 4.56417Z" fill="currentColor" />
                  </svg>
                )
              },
              {
                title: 'Integrated Payments',
                desc: 'Secure payment processing with Razorpay, coupons, and flexible subscription billing for institutions.',
                svg: (
                  <svg width="64" height="65" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.2" d="M52.575 9.44123L5.97499 22.5662C5.57831 22.6747 5.2247 22.9028 4.96234 23.2195C4.69997 23.5361 4.54161 23.926 4.50881 24.3359C4.47602 24.7459 4.57039 25.1559 4.77907 25.5103C4.98775 25.8647 5.3006 26.1461 5.67499 26.3162L27.075 36.4412C27.4942 36.6354 27.8309 36.972 28.025 37.3912L38.15 58.7912C38.3201 59.1656 38.6016 59.4785 38.9559 59.6872C39.3103 59.8958 39.7204 59.9902 40.1303 59.9574C40.5402 59.9246 40.9301 59.7662 41.2468 59.5039C41.5634 59.2415 41.7915 58.8879 41.9 58.4912L55.025 11.8912C55.1245 11.5512 55.1306 11.1906 55.0428 10.8474C54.955 10.5041 54.7765 10.1908 54.5259 9.94028C54.2754 9.68975 53.9621 9.51123 53.6189 9.42342C53.2756 9.33562 52.9151 9.34177 52.575 9.44123Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M53.8666 8.45462C53.3513 8.32282 52.8102 8.33156 52.2995 8.47988L52.2942 8.48144L5.71115 21.6016L5.70701 21.6028C5.11366 21.7659 4.5848 22.1076 4.19216 22.5815C3.79862 23.0565 3.56107 23.6413 3.51188 24.2562C3.46268 24.8711 3.60424 25.4862 3.91726 26.0177C4.22884 26.5468 4.69522 26.9675 5.25338 27.2231L26.6472 37.3452L26.6472 37.3452L26.6546 37.3486C26.8589 37.4432 27.0229 37.6072 27.1175 37.8115L27.1174 37.8115L27.1209 37.8189L37.243 59.2126C37.4985 59.7708 37.9192 60.2372 38.4484 60.5488C38.9799 60.8619 39.595 61.0034 40.2099 60.9542C40.8248 60.905 41.4096 60.6675 41.8846 60.2739C42.3586 59.8813 42.7002 59.3524 42.8634 58.759L42.8645 58.755L55.9847 12.1719L55.9862 12.1668C56.1346 11.656 56.1433 11.1149 56.0115 10.5996C55.8792 10.0825 55.6103 9.61055 55.2329 9.23317C54.8556 8.85579 54.3836 8.58688 53.8666 8.45462Z" fill="currentColor" />
                  </svg>
                )
              },
            ].map((feature, i) => (
              <div key={i} className="col-lg-4 col-sm-6 text-center features-icon-box">
                <div className="mb-4 text-primary text-center">
                  {feature.svg}
                </div>
                <h5 className="mb-2">{feature.title}</h5>
                <p className="features-icon-description">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="section-py bg-body">
        <div className="container">
          <div className="row align-items-center gx-0 gy-6 g-lg-5">
            <div className="col-lg-6">
              <div>
                <span className="badge bg-label-primary mb-3">Comprehensive Dashboard</span>
                <h3 className="mb-3 fw-extrabold">Manage Your Learning Organization</h3>
                <p className="mb-4">Get complete visibility and control over your entire learning ecosystem. Our intuitive dashboard puts all essential metrics and management tools at your fingertips.</p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {[
                    'Real-time analytics and reporting',
                    'Student progress tracking',
                    'Course management tools',
                    'Payment and billing overview'
                  ].map((item, i) => (
                    <li key={i} className="mb-3 d-flex align-items-center">
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#7367F0',
                        color: '#fff',
                        marginRight: 12,
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <img
                src="/images/Mockups/works1.png"
                alt="Dashboard"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product Features Section */}
      <section className="section-py">
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge bg-label-primary">Product Capabilities</span>
          </div>
          <h3 className="text-center mb-1 fw-extrabold">
            Everything Your Learning Team Needs
          </h3>
          <p className="text-center mb-12">
            Powerful tools designed to streamline course creation, delivery, and management.
          </p>

          <div className="row g-6">
            {[
              {
                title: 'Tutor Dashboard',
                desc: 'Create and manage courses with ease. Upload videos, create assignments, and track student progress all in one place.',
                features: ['Course Builder', 'Assignment Creation', 'Live Class Scheduling', 'Quiz & Assessment Tools', 'Student Progress Tracking', 'Grading & Feedback']
              },
              {
                title: 'Student Portal',
                desc: 'Engaging learning experience with video streaming, course materials, assessments, and certification tracking.',
                features: ['Video Playback', 'Interactive Quizzes', 'Assignment Submissions', 'Progress Dashboard', 'Certification Tracking', 'Q&A Forum']
              },
              {
                title: 'Admin & Institutional Control',
                desc: 'Full platform administration with user management, analytics, white-label options, and billing oversight.',
                features: ['User Management', 'Analytics & Reports', 'Subscription Billing', 'White-label Setup', 'Coupon Management', 'System Settings']
              }
            ].map((product, i) => (
              <div key={i} className="col-lg-4 col-md-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title mb-3">{product.title}</h5>
                    <p className="text-body-secondary mb-4">{product.desc}</p>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: '#64748b' }}>Key Features:</p>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {product.features.map((feature, j) => (
                          <li key={j} style={{ fontSize: '0.875rem', marginBottom: 8, color: '#475569' }}>
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-py bg-body">
        <div className="container">
          <div className="row align-items-center gx-0 gy-6 g-lg-5">
            <div className="col-lg-6 order-lg-2 text-center">
              <img
                src="/images/Mockups/works2.png"
                alt="How It Works"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="col-lg-6 order-lg-1">
              <span className="badge bg-label-primary mb-3">How It Works</span>
              <h3 className="mb-4 fw-extrabold">Simple 3-Step Process</h3>

              <div className="mb-5">
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>1</div>
                  <div>
                    <h5 className="mb-2">Set Up Your Organization</h5>
                    <p className="text-body-secondary">Create your account, invite team members, and configure your organization settings in minutes.</p>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <h5 className="mb-2">Create & Publish Courses</h5>
                    <p className="text-body-secondary">Upload your course materials, videos, and assignments. Organize content with an intuitive course builder.</p>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <h5 className="mb-2">Engage & Track Learners</h5>
                    <p className="text-body-secondary">Invite learners, monitor their progress, and measure learning outcomes with detailed analytics.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Lab Section */}
      <section className="section-py bg-body">
        <div className="container">
          <div className="row align-items-center gx-0 gy-6 g-lg-5">
            <div className="col-lg-6">
              <span className="badge bg-label-primary mb-3">Advanced Learning</span>
              <h3 className="mb-3 fw-extrabold">AI-Powered Practice Lab</h3>
              <p className="mb-4">Give learners hands-on experience with real-world scenarios. Our AI-powered practice modules evaluate submissions and provide intelligent feedback to accelerate learning.</p>

              <div className="mb-4">
                <div className="d-flex mb-4">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: primary,
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">Scenario-Based Practice</h5>
                    <p className="text-body-secondary mb-0">Multiple practice modules: Case Drafting, Contract Drafting, Client Interview, Courtroom Arguments, Moot Court, Legal Research, and Arbitration/Mediation.</p>
                  </div>
                </div>

                <div className="d-flex mb-4">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: primary,
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">AI-Powered Evaluation</h5>
                    <p className="text-body-secondary mb-0">Instant AI feedback on submissions with scoring and detailed analysis to help learners improve their skills.</p>
                  </div>
                </div>

                <div className="d-flex">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: primary,
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">Tutor Review & Certification</h5>
                    <p className="text-body-secondary mb-0">Tutors can review AI scores, provide additional feedback, and certify learner competency.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <img
                src="/images/Mockups/practice.png"
                alt="Practice Lab"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="section-py">
        <div className="container">
          <div className="text-center mb-12">
            <span className="badge bg-label-primary">Learner Recognition</span>
            <h3 className="mb-3 fw-extrabold">Professional Certifications</h3>
            <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1rem', color: '#64748b' }}>
              Recognize learner achievements with verifiable certificates upon course completion. Boost credentials and showcase expertise.
            </p>
          </div>

          <div className="row g-6">
            {[
              {
                icon: '🎓',
                title: 'Completion Certificates',
                desc: 'Award certificates upon successful course completion with customizable branding and verification links.'
              },
              {
                icon: '⭐',
                title: 'Performance Badges',
                desc: 'Issue achievement badges for quiz mastery, practice completion, and skill certifications.'
              },
              {
                icon: '📊',
                title: 'Transcript Reports',
                desc: 'Generate detailed learner transcripts showing courses completed, assessments passed, and skills acquired.'
              }
            ].map((cert, i) => (
              <div key={i} className="col-lg-4 col-md-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-body text-center">
                    <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{cert.icon}</div>
                    <h5 className="card-title mb-3">{cert.title}</h5>
                    <p className="text-body-secondary mb-0">{cert.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="section-py bg-body">
        <div className="container">
          <div className="row align-items-center gx-0 gy-6 g-lg-5">
            <div className="col-lg-6 text-center">
              <img
                src="https://ledx.luminouslogics.com/img/illustrations/authi.png"
                alt="LedX AI Assistant"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="col-lg-6">
              <span className="badge bg-label-primary mb-3">AI-Powered Learning</span>
              <h3 className="mb-3 fw-extrabold">Meet LedX Assistant</h3>
              <p className="mb-4">Your intelligent learning companion powered by advanced AI. LedX Assistant provides personalized support, smart recommendations, and instant answers to learner questions.</p>

              <div className="mb-4">
                <div className="d-flex mb-4">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">Personalized Learning Paths</h5>
                    <p className="text-body-secondary mb-0">AI analyzes learner behavior and creates customized course recommendations tailored to individual needs and goals.</p>
                  </div>
                </div>

                <div className="d-flex mb-4">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">24/7 Instant Support</h5>
                    <p className="text-body-secondary mb-0">Get immediate answers to questions, clarifications on course content, and helpful guidance whenever you need it.</p>
                  </div>
                </div>

                <div className="d-flex mb-4">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">Smart Content Suggestions</h5>
                    <p className="text-body-secondary mb-0">Receive intelligent suggestions for additional resources, related courses, and learning materials based on your progress.</p>
                  </div>
                </div>

                <div className="d-flex">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#7367F0',
                    color: '#fff',
                    marginRight: 16,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h5 className="mb-1">Performance Analytics</h5>
                    <p className="text-body-secondary mb-0">AI-powered insights help identify knowledge gaps, predict challenges, and optimize your learning experience.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ background: '#f8fafc', paddingTop: 80, paddingBottom: 80 }}>
        <div className="container">
          <div className="row g-4 text-center">
            {[
              { number: '98%', label: 'Course Completion Rate' },
              { number: '10K+', label: 'Active Learners' },
              { number: '500+', label: 'Courses Available' },
              { number: '24/7', label: 'Learning Access' },
            ].map((stat, i) => (
              <div key={i} className="col-md-3 col-6">
                <div style={{ fontSize: '3rem', fontWeight: 700, color: primary, marginBottom: 8 }}>{stat.number}</div>
                <div style={{ color: '#64748b' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="landingPricing" className="section-py bg-body landing-pricing">
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge bg-label-primary">Pricing Plans</span>
          </div>
          <h4 className="text-center mb-1">
            <span className="position-relative fw-extrabold z-1">
              Transparent pricing
            </span>
            for every organization
          </h4>
          <p className="text-center pb-2 mb-7">
            All plans include comprehensive learning management tools, video hosting, and analytics.<br />Choose the plan that fits your organizational needs.
          </p>

          <div className="text-center mb-12">
            <div className="position-relative d-inline-block pt-3 pt-md-0">
              <label className="switch switch-sm switch-primary me-0">
                <span className="switch-label fs-6 text-body me-3">Pay Monthly</span>
                <input
                  type="checkbox"
                  className="switch-input price-duration-toggler"
                  checked={pricingPeriod === 'annual'}
                  onChange={(e) => setPricingPeriod(e.target.checked ? 'annual' : 'monthly')}
                />
                <span className="switch-toggle-slider">
                  <span className="switch-on"></span>
                  <span className="switch-off"></span>
                </span>
                <span className="switch-label fs-6 text-body ms-3">Pay Annual</span>
              </label>
              {pricingPeriod === 'annual' && (
                <div className="pricing-plans-item position-absolute d-flex" style={{ left: '120px', top: '-40px' }}>
                  <span className="fw-medium mt-2"> Save 25%</span>
                </div>
              )}
            </div>
          </div>

          <div className="row g-6 pt-lg-5">
            {[
              {
                name: 'Starter',
                monthlyPrice: 500,
                annualPrice: 375,
                featured: false,
                icon: 'paper-airplane.png',
                features: ['Up to 100 learners', 'Basic course creation', 'Video hosting (Mux)', 'Quizzes & Assignments', 'Certificates', 'Basic analytics', 'Email support']
              },
              {
                name: 'Professional',
                monthlyPrice: 1500,
                annualPrice: 1125,
                featured: true,
                icon: 'plane.png',
                features: ['Up to 1000 learners', 'Advanced course creation', 'HD video hosting', 'Live Classes', 'AI Practice Lab', 'Assessments & Certifications', 'Doubt Q&A Forum', 'Detailed analytics', 'Priority support', 'Razorpay integration']
              },
              {
                name: 'Enterprise',
                monthlyPrice: null,
                annualPrice: null,
                featured: false,
                icon: 'rocket.png',
                features: ['Unlimited learners', 'All Professional features', 'White-label options', 'Custom Practice Scenarios', 'Advanced Analytics & Reports', 'Subscription Management', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee']
              },
            ].map((plan, i) => (
              <div key={i} className={`col-xl-4 col-lg-6 ${plan.featured ? 'position-relative' : ''}`}>
                {plan.featured && <div className="pricing-badge">Most Popular</div>}
                <div className={`card h-100 ${plan.featured ? 'border shadow-xl' : 'shadow-sm'}`} style={{
                  borderColor: plan.featured ? primary : '#e2e8f0',
                  borderWidth: plan.featured ? 2 : 1,
                  transform: plan.featured ? 'scale(1.05)' : 'none'
                }}>
                  <div className="card-header">
                    <div className="text-center">
                      <img
                        src={`/images/front-pages/icons/${plan.icon}`}
                        alt={plan.name}
                        style={{ maxHeight: 56, marginBottom: 16 }}
                      />
                      <h4 className="mb-0">{plan.name}</h4>
                      <div className="d-flex align-items-center justify-content-center mt-3">
                        {plan.monthlyPrice ? (
                          <>
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: primary, marginBottom: 0 }}>
                              ${pricingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice}
                            </span>
                            <sub style={{ fontSize: '1rem', color: '#64748b', marginBottom: -8, marginLeft: 8 }}>/mo</sub>
                          </>
                        ) : (
                          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: primary }}>Custom Pricing</span>
                        )}
                      </div>
                      <div className="position-relative pt-2">
                        {pricingPeriod === 'annual' && plan.annualPrice && (
                          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                            ${plan.annualPrice * 12} / year
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32 }}>
                      {plan.features.map((feature, j) => (
                        <li key={j} className="mb-3">
                          <h6 className="d-flex align-items-center mb-0">
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: plan.featured ? primary : '#e2e8f0',
                              color: plan.featured ? '#fff' : primary,
                              marginRight: 12,
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>✓</span>
                            {feature}
                          </h6>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePricingButtonClick(plan.name)}
                      className={`btn w-100 fw-semibold ${plan.featured ? 'btn-primary' : 'btn-outline-secondary'}`}>
                      {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="landingContact" className="section-py bg-body landing-contact">
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge bg-label-primary">Contact US</span>
          </div>
          <h4 className="text-center mb-1">
            <span className="position-relative fw-extrabold z-1">
              Ready to transform
            </span>
            your learning?
          </h4>
          <p className="text-center mb-12 pb-md-4">Get in touch with our team to discuss your learning needs and find the perfect solution.</p>
          <div className="row g-6">
            <div className="col-lg-5">
              <div className="contact-img-box position-relative border p-2 h-100">
                <img
                  src="/images/Mockups/report.png"
                  alt="contact customer service"
                  className="contact-img w-100"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                <div className="p-4 pb-2">
                  <div className="row g-4">
                    <div className="col-md-6 col-lg-12 col-xl-6">
                      <div className="d-flex align-items-center">
                        <div className="badge bg-label-primary rounded p-2 me-3">
                          <i className="icon-base ti tabler-mail icon-lg"></i>
                        </div>
                        <div>
                          <p className="mb-0" style={{ fontSize: '0.875rem' }}>Email</p>
                          <h6 className="mb-0">
                            <a href="mailto:example@gmail.com" style={{ color: '#0f172a', textDecoration: 'none' }}>
                              example@gmail.com
                            </a>
                          </h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-lg-12 col-xl-6">
                      <div className="d-flex align-items-center">
                        <div className="badge bg-label-success rounded p-2 me-3">
                          <i className="icon-base ti tabler-phone-call icon-lg"></i>
                        </div>
                        <div>
                          <p className="mb-0" style={{ fontSize: '0.875rem' }}>Phone</p>
                          <h6 className="mb-0">
                            <a href="tel:+1234-568-963" style={{ color: '#0f172a', textDecoration: 'none' }}>
                              +1234 568 963
                            </a>
                          </h6>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="card h-100">
                <div className="card-body">
                  <h4 className="mb-2">Send a message</h4>
                  <p className="mb-6">
                    Have questions about our platform, pricing, or implementation?<br className="d-none d-lg-block" />
                    Get in touch with our team today.
                  </p>
                  <form onSubmit={handleFormSubmit}>
                    <div className="row g-4">
                      <div className="col-md-6">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="john"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="johndoe@gmail.com"
                          name="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Message</label>
                        <textarea
                          className="form-control"
                          rows={7}
                          placeholder="Write a message"
                          name="message"
                          value={formData.message}
                          onChange={handleFormChange}
                          required
                        ></textarea>
                      </div>
                      <div className="col-12">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={formSubmitting}
                        >
                          {formSubmitting ? 'Sending...' : 'Send inquiry'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="landingFAQ" className="section-py bg-body landing-faq">
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge bg-label-primary">FAQ</span>
          </div>
          <h4 className="text-center mb-1">
            Frequently asked
            <span className="position-relative fw-extrabold z-1">
              {' '}questions
            </span>
          </h4>
          <p className="text-center mb-12 pb-md-4">Browse through these FAQs to find answers to commonly asked questions.</p>

          <div className="row gy-12 align-items-center">
            <div className="col-lg-5">
              <div className="text-center">
                <img
                  src="/img/illustrations/girl-sitting-with-laptop.png"
                  alt="girl sitting with laptop"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
            <div className="col-lg-7">
              <div>
                {[
                  { q: 'What live class features are available?', a: 'Live classes support real-time video streaming, interactive engagement, automated recording, and replay availability. Perfect for conducting seminars, Q&A sessions, and synchronous learning experiences.' },
                  { q: 'How does the AI Practice Lab work?', a: 'The Practice Lab offers scenario-based modules like Case Drafting, Contract Drafting, Client Interviews, and more. Learners submit their work and receive instant AI-powered evaluation with actionable feedback. Tutors can review and provide additional certification.' },
                  { q: 'Can students earn certificates?', a: 'Yes! Upon course completion, students earn verifiable digital certificates with your organization\'s branding. You can also issue performance badges and generate transcript reports showcasing learner achievements.' },
                  { q: 'Is there a Q&A/Doubt forum?', a: 'Absolutely! Our Doubt Resolution system allows students to ask course-related questions, which tutors can answer in real-time. It builds community and ensures no learner is left behind.' },
                  { q: 'Is there a free trial available?', a: 'Yes! We offer a 14-day free trial for all plans. You can explore all features including live classes, practice labs, and certifications. No credit card required.' },
                  { q: 'Can I integrate LedX with our existing systems?', a: 'Absolutely! LedX provides comprehensive APIs and integrations with popular enterprise systems. Our technical team can help with custom integrations based on your specific requirements.' },
                  { q: 'How do you handle data security and compliance?', a: 'We take security seriously with enterprise-grade encryption, SSL/TLS protocols, and regular security audits. We comply with GDPR, HIPAA, and SOC 2 standards to protect your data and your learners\' information.' },
                  { q: 'What kind of support is included?', a: 'All plans include email support. Professional and Enterprise plans get priority support with dedicated account managers. We also provide comprehensive documentation, tutorials, and training for your team.' },
                ].map((faq, i) => (
                  <div key={i} className="card border-0 shadow-sm mb-3">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? -1 : i)}
                      className="btn btn-link text-start p-4 d-flex justify-content-between align-items-center w-100"
                      style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600 }}
                    >
                      {faq.q}
                      <span style={{ transition: 'transform 0.3s', transform: expandedFaq === i ? 'rotate(180deg)' : 'none', color: primary, fontSize: '1.5rem' }}>▼</span>
                    </button>
                    {expandedFaq === i && (
                      <div className="p-4 border-top" style={{ borderColor: '#e2e8f0' }}>
                        <p style={{ color: '#64748b' }}>{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="landingCTA" className="section-py landing-cta position-relative p-lg-0 pb-0" style={{
        backgroundImage: `url('/images/front-pages/backgrounds/cta-bg-light.png')`,
        backgroundPosition: 'bottom right',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed'
      }}>
        <img
          src="/images/front-pages/backgrounds/cta-bg-light.png"
          style={{ position: 'absolute', bottom: 0, right: 0, height: '100%', width: '100%', zIndex: -1, objectFit: 'cover' }}
          alt="cta background"
        />
        <div className="container">
          <div className="row align-items-center gy-12">
            <div className="col-lg-6 text-start text-sm-center text-lg-start">
              <h3 className="cta-title text-primary fw-bold mb-1">Ready to Transform Learning?</h3>
              <h5 className="text-body mb-8">Start with LedX today - 14-day free trial, no credit card needed</h5>
              <Link href="#landingPricing" className="btn btn-lg btn-primary">Get Started Free</Link>
            </div>
            <div className="col-lg-6 pt-lg-12 text-center text-lg-end">
              <img
                src="/images/Mockups/stdDash.png"
                alt="cta dashboard"
                style={{ maxWidth: '100%', height: 'auto', marginTop: 32 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', paddingTop: 48, paddingBottom: 48 }}>
        <div className="container mb-5">
          <div className="row g-5">
            <div className="col-lg-3 col-md-6">
              <h5 style={{ color: '#fff', fontWeight: 700, marginBottom: 16 }}>LedX eLearning</h5>
              <p style={{ fontSize: '0.875rem' }}>Enterprise Learning Management System for modern organizations transforming how teams learn and grow.</p>
            </div>
            <div className="col-lg-3 col-md-6">
              <h6 style={{ color: '#fff', fontWeight: 600, marginBottom: 16 }}>Product</h6>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: 8 }}><a href="#landingFeatures" style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Features</a></li>
                <li style={{ marginBottom: 8 }}><a href="#landingPricing" style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Pricing</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Security</a></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6">
              <h6 style={{ color: '#fff', fontWeight: 600, marginBottom: 16 }}>Company</h6>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: 8 }}><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>About</a></li>
                <li style={{ marginBottom: 8 }}><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Blog</a></li>
                <li><a href="#landingContact" style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Contact</a></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6">
              <h6 style={{ color: '#fff', fontWeight: 600, marginBottom: 16 }}>Legal</h6>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: 8 }}><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Privacy</a></li>
                <li style={{ marginBottom: 8 }}><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Terms</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}>Cookies</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 32, marginTop: 32 }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <p style={{ margin: 0, fontSize: '0.875rem' }}>© 2025 LedX. All rights reserved.</p>
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Twitter</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>LinkedIn</a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
