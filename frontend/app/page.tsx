import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SectionTwo from "./components/SectionTwo";
import SectionThree from "./components/SectionThree";
import SectionFour from "./components/SectionFour";
import SectionFive from "./components/SectionFive";
import FAQSection from "./components/FAQSection";
import FooterSection from "./components/FooterSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-lime flex flex-col select-none relative w-full overflow-x-hidden">
      <Navbar />
      <Hero />
      <SectionTwo />
      <SectionThree />
      <SectionFour />
      <SectionFive />
      <FAQSection />
      <FooterSection />
    </div>
  );
}



