import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface OnboardingTourProps {
  role: "worker" | "employer" | "admin";
  onClose?: () => void;
  forceShow?: boolean;
}

interface TourStep {
  targetId: string;
  title: { [key: string]: string };
  description: { [key: string]: string };
  placement: "bottom" | "top" | "left" | "right" | "center";
}

export default function OnboardingTour({ role, onClose, forceShow = false }: OnboardingTourProps) {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Define steps per role with localized content
  const stepsMap: { [key in "worker" | "employer" | "admin"]: TourStep[] } = {
    worker: [
      {
        targetId: "tour-welcome",
        placement: "center",
        title: {
          en: "Welcome to EmpoWork! 👋",
          hi: "एमपोवर्क में आपका स्वागत है! 👋",
          kn: "ಎಂಪೋವರ್ಕ್‌ಗೆ ಸುಸ್ವಾಗತ! 👋",
          te: "ఎంపోవర్క్‌కు స్వాగతం! 👋"
        },
        description: {
          en: "Let's take a 1-minute quick interactive tour to guide you through the features built to empower you and secure your daily wages.",
          hi: "आइए 1 मिनट का त्वरित इंटरैक्टिव टूर लें जो आपको आपके दैनिक वेतन को सुरक्षित करने और सशक्त बनाने के लिए बनाए गए फीचर्स के बारे में बताएगा।",
          kn: "ನಿಮ್ಮ ದೈನಂದಿನ ವೇತನವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಲು ಮತ್ತು ನಿಮ್ಮನ್ನು ಸಬಲೀಕರಣಗೊಳಿಸಲು ನಿರ್ಮಿಸಲಾದ ವೈಶಿಷ್ಟ್ಯಗಳ ಮೂಲಕ ನಿಮಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಲು 1 ನಿಮಿಷದ ತ್ವರಿತ ಪ್ರವಾಸ ಕೈಗೊಳ್ಳೋಣ.",
          te: "మీ రోజువారీ వేతనాన్ని సురక్షితంగా పొందడానికి మరియు మిమ్మల్ని బలోపేతం చేయడానికి రూపొందించిన ఫీచర్ల గురించి తెలుసుకోవడానికి 1-నిమిషం క్విక్ టూర్ చేద్దాం."
        }
      },
      {
        targetId: "tour-worker-dashboard",
        placement: "right",
        title: {
          en: "🏠 Your Dashboard Overview",
          hi: "🏠 आपका डैशबोर्ड अवलोकन",
          kn: "🏠 ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮುಖಪುಟ",
          te: "🏠 మీ ಡ్యాష్‌బోర్డ్ హోమ్"
        },
        description: {
          en: "See your verified worker badge, professional AI bio, real-time local job matching alerts, and immediate offline synchronization status at a single glance.",
          hi: "एक ही नज़र में अपना सत्यापित कार्यकर्ता बैज, पेशेवर एआई बायो, वास्तविक समय स्थानीय नौकरी अलर्ट, और ऑफ़लाइन सिंक स्थिति देखें।",
          kn: "ನಿಮ್ಮ ಪರಿಶೀಲಿಸಿದ ಕಾರ್ಮಿಕ ಬ್ಯಾಡ್ಜ್, ಪ್ರೊಫೆಷನಲ್ ಎಐ ಬಯೋ, ಉದ್ಯೋಗದ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಆಫ್‌ಲೈನ್ ಸಿಂಕ್ ಸ್ಥಿತಿಯನ್ನು ಇಲ್ಲಿ ಒಂದೇ ಕಡೆ ನೋಡಿ.",
          te: "మీ వెరిఫైడ్ వర్కర్ బ్యాడ్జ్, ప్రೊఫెషనల్ AI బయో, రియల్-టైమ్ జాబ్ అలర్ట్‌లు మరియు ఆఫ్-లైన్ సింక్ స్టేటస్ ఇక్కడే చూడవచ్చు."
        }
      },
      {
        targetId: "tour-worker-profile",
        placement: "right",
        title: {
          en: "👤 Your Professional Identity",
          hi: "👤 आपकी पेशेवर पहचान",
          kn: "👤 ನಿಮ್ಮ ಪ್ರೊಫೆಷನಲ್ ಪ್ರೊಫೈಲ್",
          te: "👤 మీ ప్రೊఫెషనಲ್ ప్రೊఫైల్"
        },
        description: {
          en: "Keep your verified trade skills (like Mason, Painter, Electrician), daily wage expectations, Aadhaar verification, and bank details updated so local contractors can easily contact and pay you.",
          hi: "अपने सत्यापित कौशल (जैसे राजमिस्त्री, पेंटर, बिजली मिस्त्री), अपेक्षित दैनिक वेतन और बैंक विवरण अपडेट रखें ताकि ठेकेदार आपसे आसानी से संपर्क कर सकें।",
          kn: "ನಿಮ್ಮ ಕೌಶಲ್ಯಗಳು (ರಾಜಮಿಸ್ತ್ರಿ, ಪೇಂಟರ್ ಇತ್ಯಾದಿ), ವೇತನದ ನಿರೀಕ್ಷೆ ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರಗಳನ್ನು ಅಪ್‌ಡೇಟ್ ಮಾಡಿ ಇದರಿಂದ ಗುತ್ತಿಗೆದಾರರು ನಿಮ್ಮನ್ನು ಸುಲಭವಾಗಿ ಸಂಪರ್ಕಿಸಬಹುದು.",
          te: "మీ నైపుణ్యాలు (మేసన్, పెయింటర్ ఇతరులు), రోజువారీ వేతన నిరీక్షణ మరియు బ్యాంక్ వివరాలను అప్‌డేట్ చేసుకోండి, తద్వారా కాంట్రాక్టర్లు మిమ్మల్ని సంప్రదించగలరు."
        }
      },
      {
        targetId: "tour-find-jobs",
        placement: "right",
        title: {
          en: "👷 Find & Apply for Jobs",
          hi: "👷 नौकरियां खोजें और आवेदन करें",
          kn: "👷 ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ ಮತ್ತು ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
          te: "👷 ఉద్యోగాలు వెతకండి & అప్లై చేయండి"
        },
        description: {
          en: "Browse verified local daily-wage slots. See construction slot details, precise hourly/daily wage rates, and apply with one tap.",
          hi: "सत्यापित स्थानीय दैनिक वेतन स्लॉट ब्राउज़ करें। निर्माण विवरण, सटीक प्रति घंटा/दैनिक वेतन दरें देखें और एक टैप में आवेदन करें।",
          kn: "ಪರಿಶೀಲಿಸಿದ ಸ್ಥಳೀಯ ದೈನಂದಿನ ವೇತನ ಸ್ಲಾಟ್‌ಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ. ಕೆಲಸದ ವಿವರಗಳು, ವೇತನ ದರಗಳನ್ನು ನೋಡಿ ಮತ್ತು ಒಂದೇ ಟ್ಯಾಪ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
          te: "ధృవీకరించబడిన స్థానిక రోజువారీ వేతన పనులను బ్రౌజ్ చేయండి. పని వివరాలు, గంట/రోజువారీ వేతన రేట్లను చూసి ఒకే క్లిక్‌తో అప్లై చేసుకోండి."
        }
      },
      {
        targetId: "tour-worker-applications",
        placement: "right",
        title: {
          en: "📝 Manage Your Applications",
          hi: "📝 अपने आवेदनों का प्रबंधन करें",
          kn: "📝 ನಿಮ್ಮ ಅರ್ಜಿಗಳ ನಿರ್ವಹಣೆ",
          te: "📝 మీ దరఖాస్తుల నిర్వహణ"
        },
        description: {
          en: "Track the real-time status of your job applications, review approved slots, and access job coordination details easily.",
          hi: "अपने नौकरी आवेदनों की वास्तविक समय स्थिति को ट्रैक करें, स्वीकृत स्लॉट की समीक्षा करें और नौकरी विवरण आसानी से देखें।",
          kn: "ನಿಮ್ಮ ಉದ್ಯೋಗ ಅರ್ಜಿಗಳ ನೈಜ-ಸಮಯದ ಸ್ಥಿತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಅನುಮೋದಿತ ಉದ್ಯೋಗಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಿವರಗಳನ್ನು ಸುಲಭವಾಗಿ ಪ್ರವೇಶಿಸಿ.",
          te: "మీ ఉద్యోగ దరఖాస్తుల ప్రస్తుత స్థితిని ట్రాక్ చేయండి, ఆమోదించబడిన పనులను మరియు వివరాలను సులభంగా తెలుసుకోండి."
        }
      },
            {
        targetId: "tour-check-in",
        placement: "right",
        title: {
          en: "📅 Verified Geo-Attendance",
          hi: "📅 सत्यापित जियो-उपस्थिति",
          kn: "📅 ಜಿಯೋ-ಹಾಜರಾತಿ ನೋಂದಣಿ",
          te: "📅 ధృవీకరించబడిన జియో-ಹಾజరు"
        },
        description: {
          en: "Check-in directly from construction sites. Log your work hours securely to local storage or cloud to guarantee wage records.",
          hi: "सीधे निर्माण स्थल से चेक-इन करें। अपने काम के घंटों को सुरक्षित रूप से स्थानीय या क्लाउड पर लॉग करें ताकि वेतन रिकॉर्ड की गारंटी रहे।",
          kn: "ಕೆಲಸದ ಸ್ಥಳದಿಂದ ನೇರವಾಗಿ ಚೆಕ್-ಇನ್ ಮಾಡಿ. ವೇತನ ದಾಖಲೆಗಳನ್ನು ಖಾತರಿಪಡಿಸಲು ನಿಮ್ಮ ಕೆಲಸದ ಸಮಯವನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಿ.",
          te: "పని స్థలం నుండి నేరుగా చెక్-ఇన్ చేయండి. వేతన రికార్డుల కోసం మీ పని గంటలను సురక్షితంగా రికార్డ్ చేయండి."
        }
      },
      {
        targetId: "tour-worker-earnings",
        placement: "right",
        title: {
          en: "💰 Live Earnings & Savings goals",
          hi: "💰 लाइव कमाई और बचत लक्ष्य",
          kn: "💰 ಸಂಪಾದನೆ ಮತ್ತು ಉಳಿತಾಯ ಗುರಿಗಳು",
          te: "💰 ఆదాయాలు మరియు పొదుపు లక్ష్యాలు"
        },
        description: {
          en: "Track all your completed shifts, paid daily wages, pending credits, and visually manage smart savings targets for tools or family.",
          hi: "अपने सभी पूरे किए गए शिफ्ट, भुगतान किए गए दैनिक वेतन, लंबित क्रेडिट ट्रैक करें और स्मार्ट बचत लक्ष्यों का प्रबंधन करें।",
          kn: "ನಿಮ್ಮ ಎಲ್ಲಾ ಪೂರ್ಣಗೊಂಡ ಕೆಲಸಗಳು, ಪಾವತಿಸಿದ ವೇತನಗಳು ಮತ್ತು ಬಾಕಿ ಹಣವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಹಾಗೂ ಹೊಸ ಉಳಿತಾಯ ಗುರಿಗಳನ್ನು ಹೊಂದಿಸಿ.",
          te: "మీరు పూర్తి చేసిన పనులు, పొందిన రోజువారీ వేతనం, బకాయిలను ట్రాక్ చేయండి మరియు మీ పొదుపు లక్ష్యాలను నిర్వహించండి."
        }
      },
{
        targetId: "tour-skills",
        placement: "right",
        title: {
          en: "🎓 AI Skill Coach (EmpoGuru)",
          hi: "🎓 एआई स्किल कोच (एमपोगुरु)",
          kn: "🎓 ಎಐ ಕೌಶಲ್ಯ ತರಬೇತುದಾರ (ಎಂಪೋಗುರು)",
          te: "🎓 AI నైపుణ్య శిక్షకుడు (ఎంపోగురు)"
        },
        description: {
          en: "Ask EmpoGuru questions in your local language about professional trade tips, PPE gear checklist guides, and smart digital savings tools.",
          hi: "एमपोगुरु से अपनी स्थानीय भाषा में व्यावसायिक टिप्स, पीपीई गियर गाइडलाइंस और स्मार्ट डिजिटल बचत उपकरणों के बारे में सवाल पूछें।",
          kn: "ವೃತ್ತಿಪರ ಸಲಹೆಗಳು, ಸುರಕ್ಷತಾ ಸಾಧನಗಳ ಗೈಡ್‌ಲೈನ್‌ಗಳು ಮತ್ತು ಸ್ಮಾರ್ಟ್ ಉಳಿತಾಯ ಸಾಧನಗಳ ಬಗ್ಗೆ ಎಂಪೋಗುರು ಜೊತೆ ನಿಮ್ಮದೇ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ.",
          te: "వృత్తిపరమైన పనుల చిట్కాలు, సేఫ్టీ గేర్ గైడ్‌లైన్స్ మరియు స్మార్ట్ పొదుపు సాధనాల గురించి ఎంపోగురుని మీ స్థానిక భాషలో అడగండి."
        }
      },
      {
        targetId: "tour-worker-tools",
        placement: "right",
        title: {
          en: "🛠️ Multi-utility Toolkit",
          hi: "🛠️ बहु-उपयोगिता टूलकिट",
          kn: "🛠️ ಮಲ್ಟಿ-ಯೂಟಿಲಿಟಿ ಪರಿಕರಗಳು",
          te: "🛠️ మల్టీ-ಯೂಟಿಲಿటీ టూల్‌కిట్"
        },
        description: {
          en: "Utilize the smart daily wage estimator, PPE safety checklist, and multi-lingual voice translator to coordinate easily on any job site.",
          hi: "किसी भी नौकरी स्थल पर आसानी से तालमेल बिठाने के लिए स्मार्ट दैनिक वेतन अनुमानक, पीपीई सुरक्षा चेकलिस्ट और बहुभाषी अनुवादक का उपयोग करें।",
          kn: "ಯಾವುದೇ ಕೆಲಸದ ಸ್ಥಳದಲ್ಲಿ ಸುಲಭವಾಗಿ ಸಂವಹನ ನಡೆಸಲು ವೇತನ ಅಂದಾಜು ಸಾಧನ, ಪಿಪಿಇ ಸುರಕ್ಷತಾ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ ಮತ್ತು ಅನುವಾದಕವನ್ನು ಬಳಸಿ.",
          te: "ವೇతన అంచనా సాధనం, సేఫ్టీ చెక్‌లిస్ట్ మరియు వాయిస్ ట్రాన్స్‌లేటర్‌ని ఉపయోగించి పని స్థలంలో సులభంగా మాట్లాడండి."
        }
      },
      {
        targetId: "tour-complaints",
        placement: "right",
        title: {
          en: "⚖️ Gemini AI Dispute Mediation",
          hi: "⚖️ जेमिनी एआई विवाद मध्यस्थता",
          kn: "⚖️ ಜೆಮಿನಿ ಎಐ ವಿವಾದ ಸಂಧಾನ",
          te: "⚖️ జెమిని AI వివాద పరిష్కారం"
        },
        description: {
          en: "Submit complaints regarding pending wages or safety issues. Gemini AI will evaluate neutral legal/labor guidelines and help resolve issues.",
          hi: "लंबित वेतन या सुरक्षा मुद्दों के बारे में शिकायतें दर्ज करें। जेमिनी एआई तटस्थ कानूनी/श्रम दिशानिर्देशों का मूल्यांकन करेगा और मुद्दों को हल करने में मदद करेगा।",
          kn: "ಬಾಕಿ ಇರುವ ವೇತನ ಅಥವಾ ಸುರಕ್ಷತಾ समस्याಗಳ ಬಗ್ಗೆ ದೂರು ಸಲ್ಲಿಸಿ. ಜೆಮಿನಿ ಎಐ ಕಾನೂನು ಮಾರ್गಸೂಚಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ವಿವಾದ ಬಗೆಹರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
          te: "వేతన బకాయిలు లేదా సేఫ్టీ సమస్యల గురించి ఫిర్యాదు చేయండి. జెమిని AI చట్టపరమైన మార్గదర్శకాలను పరిశీలించి సమస్య పరిష్కారానికి సహాయం చేస్తుంది."
        }
      },
      {
        targetId: "tour-language",
        placement: "bottom",
        title: {
          en: "🌐 Multilingual Support",
          hi: "🌐 बहुभाषी समर्थन",
          kn: "🌐 ಬಹುಭಾಷಾ ಬೆಂಬಲ",
          te: "🌐 బహుభాషా మద్దతు"
        },
        description: {
          en: "Switch the entire application instantly between English, Hindi, Kannada, and Telugu anytime with zero friction.",
          hi: "बिना किसी परेशानी के किसी भी समय पूरी एप्लीकेशन को अंग्रेजी, हिंदी, कन्नड़ और तेलुगु में तुरंत बदलें।",
          kn: "ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಇಡೀ ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ, ಕನ್ನಡ ಅಥವಾ ತೆಲುಗಿಗೆ ತಕ್ಷಣವೇ ಬದಲಾಯಿಸಿಕೊಳ್ಳಿ.",
          te: "ఎప్పుడైనా అప్లికేషన్ మొత్తాన్ని ఇంగ్లీష్, హిందీ, కన్నడ మరియు తెలుగులోకి సులభంగా మార్చుకోండి."
        }
      }
    ],
    employer: [
      {
        targetId: "tour-welcome",
        placement: "center",
        title: {
          en: "Welcome Contractor Console! 🏗️",
          hi: "कांट्रेक्टर कंसोल में आपका स्वागत है! 🏗️",
          kn: "ಗುತ್ತಿಗೆದಾರರ ವಿಭಾಗಕ್ಕೆ ಸುಸ್ವಾಗತ! 🏗️",
          te: "కాంట్రాక్టర్ కన్సోల్‌కు స్వాగతం! 🏗️"
        },
        description: {
          en: "Manage, hire, verify daily attendance, and process secure instant digital payouts for your site workers.",
          hi: "अपने साइट श्रमिकों के लिए प्रबंधन करें, भर्ती करें, दैनिक उपस्थिति सत्यापित करें, और सुरक्षित त्वरित डिजिटल भुगतान संसाधित करें।",
          kn: "ನಿಮ್ಮ ಸೈಟ್ ಕಾರ್ಮಿಕರನ್ನು ನಿರ್ವಹಿಸಿ, ನೇಮಕ ಮಾಡಿ, ದೈನಂದಿನ ಹಾಜರಾತಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ತ್ವರಿತ ಡಿಜಿಟಲ್ ಪಾವತಿಗಳನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ.",
          te: "మీ సైట్ కార్మికులను నిర్వహించండి, రిక్రూట్ చేసుకోండి, రోజువారీ హాజరును ధృవీకరించండి మరియు సురక్షితమైన వేగవంతమైన డిజిటల్ పేమెంట్లు చేయండి."
        }
      },
      {
        targetId: "tour-employer-jobs",
        placement: "right",
        title: {
          en: "📝 Post & Edit Jobs",
          hi: "📝 नौकरियां पोस्ट और संपादित करें",
          kn: "📝 ಉದ್ಯೋಗಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ",
          te: "📝 ఉద్యోగాలు పోస్ట్ & మేనేజ్ చేయండి"
        },
        description: {
          en: "Post construction slots with detailed wages, durational schedules, local coordinates, and manage active hirings.",
          hi: "विस्तृत वेतन, अवधि शेड्यूल, स्थानीय निर्देशांक के साथ निर्माण स्लॉट पोस्ट करें और सक्रिय भर्तियों का प्रबंधन करें।",
          kn: "ವಿವರವಾದ ವೇತನಗಳು, ವೇಳಾಪಟ್ಟಿಗಳು, ಸ್ಥಳೀಯ ನಿರ್ದೇಶಾಂಕಗಳೊಂದಿಗೆ ಹೊಸ ಉದ್ಯೋಗಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿ ಮತ್ತು ನೇಮಕಾತಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
          te: "వివరణాత్మక వేతనాలు, సమయాలు, లొకేషన్ వివరాలతో కొత్త ఉద్యోగాలను పోస్ట్ చేయండి మరియు రిక్రూట్‌మెంట్‌లను నిర్వహించండి."
        }
      },
      {
        targetId: "tour-employer-workers",
        placement: "right",
        title: {
          en: "👥 Evaluate Applicants & Attendance",
          hi: "👥 आवेदकों और उपस्थिति का मूल्यांकन करें",
          kn: "👥 ಅರ್ಜಿದಾರರು ಮತ್ತು ಹಾಜರಾತಿ ಪರಿಶೀಲನೆ",
          te: "👥 దరఖాస్తుదారులు & హాజరు పరిశీలన"
        },
        description: {
          en: "Hire local daily-wage laborers, approve geo-tagged clock-ins, check safety gear completion logs, and log wages.",
          hi: "स्थानीय दैनिक वेतन भोगी श्रमिकों को काम पर रखें, जियो-टैग क्लॉक-इन को मंजूरी दें, सुरक्षा गियर लॉग की जांच करें और वेतन दर्ज करें।",
          kn: "ಸ್ಥಳೀಯ ದೈನಂದಿನ ವೇತನ ಕಾರ್ಮಿಕರನ್ನು ನೇಮಿಸಿ, ಜಿಯೋ-ಟ್ಯಾಗ್ ಹಾಜರಾತಿ ಅನುಮೋದಿಸಿ, ಸೇಫ್ಟಿ ಗೇರ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವೇತನಗಳನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಿ.",
          te: "స్థానిక రోజువారీ వేతన కార్మికులను రిక్రూట్ చేసుకోండి, జియో-ట్యాగ్డ్ హాజరును ఆమోదించండి, సేఫ్టీ గేర్ లాగ్‌లను తనిఖీ చేసి వేతనాలను నమోదు చేయండి."
        }
      },
      {
        targetId: "tour-employer-disputes",
        placement: "right",
        title: {
          en: "⚖️ Resolve Worker Disputes",
          hi: "⚖️ श्रमिक विवादों का समाधान करें",
          kn: "⚖️ ಕಾರ್ಮಿಕರ ವಿವಾದಗಳನ್ನು ಪರಿಹರಿಸಿ",
          te: "⚖️ కార్మికుల వివాదాలను పరిష్కరించండి"
        },
        description: {
          en: "Address pending wage complaints or working condition issues with unbiased legal/labor mediation insights powered by Gemini AI.",
          hi: "जेमिनी एआई द्वारा संचालित कानूनी/श्रम मध्यस्थता अंतर्दृष्टि के साथ लंबित वेतन शिकायतों या काम की स्थिति के मुद्दों का समाधान करें।",
          kn: "ಜೆಮಿನಿ ಎಐ ಸಹಾಯದಿಂದ ಕಾರ್ಮಿಕರ ಬಾಕಿ ವೇತನ ದೂರುಗಳನ್ನು ಅಥವಾ ಕೆಲಸದ ಪರಿಸ್ಥಿತಿಯ ಸಮಸ್ಯೆಗಳನ್ನು ನಿಷ್ಪಕ್ಷಪಾತವಾಗಿ ಬಗೆಹರಿಸಿ.",
          te: "జెమిని AI సహాయంతో కార్మికుల వేతన వివాదాలు లేదా పని పరిస్థితుల సమస్యలను తటస్థంగా మరియు పారదర్శకంగా పరిష్కరించండి."
        }
      }
    ],
    admin: [
      {
        targetId: "tour-welcome",
        placement: "center",
        title: {
          en: "Welcome Welfare Officer Portal! 🏛️",
          hi: "कल्याण अधिकारी पोर्टल में आपका स्वागत है! 🏛️",
          kn: "ಕಲ್ಯಾಣ ಅಧಿಕಾರಿ ಪೋರ್ಟಲ್‌ಗೆ ಸುಸ್ವಾಗತ! 🏛️",
          te: "సంక్షేమ అధికారి పోర్టల్‌కు స్వాగతం! 🏛️"
        },
        description: {
          en: "Access system dashboards, resolve labor disputes, clean up duplicate registrations, and monitor activity logs.",
          hi: "सिस्टम डैशबोर्ड एक्सेस करें, श्रम विवादों का समाधान करें, डुप्लिकेट पंजीकरणों को साफ करें और गतिविधि लॉग की निगरानी करें।",
          kn: "ಸಿಸ್ಟಮ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗಳನ್ನು ಪ್ರವೇಶಿಸಿ, ಕಾರ್ಮಿಕ ವಿವಾದಗಳನ್ನು ಪರಿಹರಿಸಿ, ನಕಲಿ ನೋಂದಣಿಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ ಮತ್ತು ಚಟುವಟಿಕೆ ದಾಖಲೆಗಳನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಿ.",
          te: "సిస్టమ్ డాష్‌బోర్డ్‌లను యాక్సెస్ చేయండి, లేబర్ వివాదాలను పరిష్కరించండి, నకిలీ రిజిస్ట్రేషన్‌లను క్లియర్ చేయండి మరియు కార్యాచరణ లాగ్‌లను పర్యవేక్షించండి."
        }
      },
      {
        targetId: "tour-admin-disputes",
        placement: "right",
        title: {
          en: "🛡️ Supervise Disputes & Settle Issues",
          hi: "🛡️ विवादों का पर्यवेक्षण करें और मुद्दों को सुलझाएं",
          kn: "🛡️ ವಿವಾದಗಳ ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಬಗೆಹರಿಸುವಿಕೆ",
          te: "🛡️ వివాదాల పర్యవేక్షణ మరియు పరిష్కారం"
        },
        description: {
          en: "Audit pending grievances, view Gemini AI-recommended legal and mediation resolutions, and enforce wage safety protections.",
          hi: "लंबित शिकायतों का ऑडिट करें, जेमिनी एआई-अनुशंसित कानूनी और मध्यस्थता समाधान देखें, और वेतन सुरक्षा सुरक्षा लागू करें।",
          kn: "ಬಾಕಿ ಇರುವ ದೂರುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಜೆಮಿನಿ ಸೂಚಿಸಿದ ಕಾನೂನು ಪರಿಹಾರಗಳನ್ನು ಓದಿ ಮತ್ತು ದೈನಂದิน ವೇತನ ರಕ್ಷಣೆಯನ್ನು ಖಾತರಿಪಡಿಸಿ.",
          te: "వివాదాలను ఆడిట్ చేయండి, జెమిని అందించిన చట్టపరమైన సలహాలను చదవండి మరియు కార్మికుల వేతన రక్షణను పటిష్టం చేయండి."
        }
      },
      {
        targetId: "tour-admin-integrity",
        placement: "right",
        title: {
          en: "🧹 System Integrity & Deduplication",
          hi: "🧹 सिस्टम अखंडता और डिडुप्लीकेशन",
          kn: "🧹 ಸಿಸ್ಟಮ್ ಸಮಗ್ರತೆ ಮತ್ತು ನಕಲು ನಿವಾರಣೆ",
          te: "🧹 సిస్టమ్ సమగ్రత & డూప్లికేషన్ నివారణ"
        },
        description: {
          en: "Scan system database listings to automatically spot and clean duplicate accounts, double applications, and spam listings.",
          hi: "सिस्टम डेटाबेस लिस्टिंग को स्कैन करें ताकि डुप्लिकेट खाते, डबल एप्लिकेशन और स्पैम लिस्टिंग का स्वचालित रूप से पता लगाया जा सके और उन्हें साफ किया जा सके।",
          kn: "ನಕಲಿ ಖಾತೆಗಳು ಮತ್ತು ಸ್ಪ್ಯಾಮ್ ಜಾಹೀರಾತುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪತ್ತೆಹಚ್ಚಿ ಸಿಸ್ಟಮ್ ಅನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.",
          te: "డూప్లికేట్ ఖాతాలు మరియు స్పామ్ వివరాలను సిస్టమ్ నుండి స్వయంచాలకంగా గుర్తించి తొలగించండి."
        }
      },
      {
        targetId: "tour-admin-logs",
        placement: "right",
        title: {
          en: "📝 Security Audit Logs",
          hi: "📝 सुरक्षा ऑडिट लॉग",
          kn: "📝 ಭದ್ರತಾ ఆడిట్ లಾಗ್స్",
          te: "📝 సెక్యూరిటీ ఆడిట్ లాగ్స్"
        },
        description: {
          en: "Track administrative database actions, real-time logins, sync statuses, and safety broadcast alerts platform-wide.",
          hi: "प्लेटफ़ॉर्म-व्यापी प्रशासनिक डेटाबेस क्रियाओं, वास्तविक समय लॉगिन, सिंक स्थितियों और सुरक्षा प्रसारण अलर्ट को ट्रैक करें।",
          kn: "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನ ಎಲ್ಲಾ ಆಡಳಿತಾತ್ಮಕ ಬದಲಾವಣೆಗಳು, ಲಾಗಿನ್ ವಿವರಗಳು ಮತ್ತು ಸೇಫ್ಟಿ ಸೂಚನೆಗಳನ್ನು ಇಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",
          te: "ప్లాట్‌ఫారమ్ యొక్క అన్ని అడ్మినిస్ట్రేటివ్ మార్పులు, లాగిన్ ವಿವರాలు మరియు సేఫ్టీ బ్రాడ్‌కాస్ట్‌లను ఇక్కడ ట్రాక్ చేయవచ్చు."
        }
      }
    ]
  };

  const steps = stepsMap[role] || [];

  // Run on mount
  useEffect(() => {
    const hasOnboarded = localStorage.getItem(`empowork_onboarded_${role}`);
    if (!hasOnboarded || forceShow) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [role, forceShow]);

  // Scroll the targeted element into view when the step changes
  useEffect(() => {
    if (!isVisible || steps.length === 0) return;

    const step = steps[currentStep];
    if (!step || step.placement === "center" || step.targetId === "tour-welcome") return;

    const timeout = setTimeout(() => {
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [currentStep, isVisible, steps]);

  // Adjust coordinates based on targeted DOM element
  useEffect(() => {
    if (!isVisible || steps.length === 0) return;

    const step = steps[currentStep];
    if (!step) return;

    if (step.placement === "center" || step.targetId === "tour-welcome") {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // If element is not displayed, fallback to center
        if (rect.width === 0 || rect.height === 0) {
          setCoords(null);
          return;
        }
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      } else {
        setCoords(null); // fallback to center if element not found
      }
    };

    updateCoords();
    // Re-check on resize/scroll to stay anchored
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords);

    // Short timeout because sidebar items could be rendering late
    const timeout = setTimeout(updateCoords, 100);

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
      clearTimeout(timeout);
    };
  }, [isVisible, currentStep, role]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(`empowork_onboarded_${role}`, "true");
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible || steps.length === 0) return null;

  const currentStepData = steps[currentStep];
  const langCode = language in currentStepData.title ? language : "en";
  const title = currentStepData.title[langCode] || currentStepData.title["en"];
  const desc = currentStepData.description[langCode] || currentStepData.description["en"];

  // Positioning logic for target tooltip
  const getTooltipStyle = () => {
    if (!coords) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed" as const,
        zIndex: 9999
      };
    }

    const padding = 12;
    let top = coords.top + coords.height + padding;
    let left = coords.left;

    // Adjust based on specified step placement
    if (currentStepData.placement === "right") {
      top = coords.top + coords.height / 2;
      left = coords.left + coords.width + padding;
      return {
        top: `${top}px`,
        left: `${left}px`,
        transform: "translateY(-50%)",
        position: "absolute" as const,
        zIndex: 9999
      };
    } else if (currentStepData.placement === "left") {
      top = coords.top + coords.height / 2;
      left = coords.left - padding;
      return {
        top: `${top}px`,
        left: `${left}px`,
        transform: "translate(-100%, -50%)",
        position: "absolute" as const,
        zIndex: 9999
      };
    } else if (currentStepData.placement === "top") {
      top = coords.top - padding;
      left = coords.left + coords.width / 2;
      return {
        top: `${top}px`,
        left: `${left}px`,
        transform: "translate(-50%, -100%)",
        position: "absolute" as const,
        zIndex: 9999
      };
    }

    // Default: Bottom placement
    return {
      top: `${top}px`,
      left: `${left}px`,
      position: "absolute" as const,
      zIndex: 9999
    };
  };

  return createPortal(
    <div className="absolute top-0 left-0 w-full min-h-screen pointer-events-none z-[9990]">
      {/* Dark backdrop overlay - semi-transparent */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[1px] pointer-events-auto" onClick={handleSkip} />

      {/* Dynamic Highlight Overlay Spot / Glow Ring around targeted element */}
      {coords && (
        <div
          className="absolute border-2 border-amber-500 rounded-xl pointer-events-none z-[9995] transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
          style={{
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`
          }}
        >
          {/* Animated pulsing ripple ring */}
          <span className="absolute inset-0 border border-amber-500 rounded-xl scale-110 animate-ping opacity-60" />
        </div>
      )}

      {/* Floating Tooltip Card */}
      <div style={getTooltipStyle()} className="pointer-events-auto max-w-sm w-[90vw] shrink-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: coords ? 10 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-950 text-slate-100 rounded-2xl border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-5 space-y-4 font-sans text-left relative overflow-hidden"
        >
          {/* Industrial styled header glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Close / Close Tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Progress Indicator Badge */}
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-wider">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
            <span className="font-mono text-[9px] tracking-widest text-slate-500 font-bold uppercase">
              Dashboard Tour
            </span>
          </div>

          {/* Title & Body Description */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
              {title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {desc}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-900">
            {/* Skip / Replay option */}
            <button
              onClick={handleSkip}
              className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Skip Tour
            </button>

            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center space-x-1 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-amber-500/10 transition-all cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? "Finish" : "Next"}</span>
                {currentStep < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  );
}

// Small floating button to trigger tour manually
export function ReplayTourButton({ role, collapsed }: { role: "worker" | "employer" | "admin"; collapsed?: boolean }) {
  const [showTour, setShowTour] = useState(false);
  const { language } = useLanguage();

  const labels: { [key: string]: string } = {
    en: "Quick Tour",
    hi: "क्विक टूर",
    kn: "ಪ್ರವಾಸ ಕೈಗೊಳ್ಳಿ",
    te: "క్విక్ టూర్"
  };

  const label = labels[language] || labels["en"];

  return (
    <>
      <button
        onClick={() => setShowTour(true)}
        className={`flex items-center bg-slate-950 text-slate-400 hover:text-amber-500 border border-slate-800 hover:border-amber-500/40 font-mono text-[10px] tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-500/5
          ${collapsed 
            ? "w-10 h-10 justify-center rounded-full p-0 mx-auto" 
            : "w-full justify-center px-3 py-1.5 rounded-xl space-x-1.5"
          }`}
        title="Replay Dashboard Tour / हेल्प टूर"
      >
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>

      {showTour && (
        <OnboardingTour
          role={role}
          forceShow={true}
          onClose={() => setShowTour(false)}
        />
      )}
    </>
  );
}
