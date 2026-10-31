"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Icon, type IconName } from "./LandingIcons";

interface FeatureData {
  icon: IconName;
  title: string;
  text: string;
}

const featuresEn: FeatureData[] = [
  {
    icon: "box",
    title: "Smart inventory",
    text: "Know exactly what is in stock, what is moving, and what needs attention.",
  },
  {
    icon: "clock",
    title: "Expiry alerts",
    text: "Reduce loss with intelligent batch tracking and timely expiry notifications.",
  },
  {
    icon: "chart",
    title: "Real-time analytics",
    text: "Turn every sale into clear insights for faster, more confident decisions.",
  },
  {
    icon: "people",
    title: "Staff management",
    text: "Create roles, track shifts, and keep every counter working in sync.",
  },
  {
    icon: "report",
    title: "One-click reports",
    text: "Generate sales, profit, VAT, and purchase reports whenever you need them.",
  },
  {
    icon: "cloud",
    title: "Secure cloud access",
    text: "Run your pharmacy securely from any device, at any time.",
  },
];

const featuresBn: FeatureData[] = [
  {
    icon: "box",
    title: "স্মার্ট ইনভেন্টরি",
    text: "কী পরিমাণ স্টক আছে, কোন ওষুধ দ্রুত বিক্রি হচ্ছে এবং কোনটিতে নজর দেওয়া দরকার তা সহজে জানুন।",
  },
  {
    icon: "clock",
    title: "মেয়াদোত্তীর্ণ অ্যালার্ট",
    text: "ইন্টেলিজেন্ট ব্যাচ ট্র্যাকিং ও সঠিক সময়ে সতর্কবার্তার মাধ্যমে ওষুধের আর্থিক ক্ষতি কমান।",
  },
  {
    icon: "chart",
    title: "রিয়েল-টাইম অ্যানালিটিক্স",
    text: "প্রতিটি বিক্রয়কে সুনির্দিষ্ট পরিসংখ্যানে রূপান্তর করে দ্রুত ও আত্মবিশ্বাসী ব্যবসায়িক সিদ্ধান্ত নিন।",
  },
  {
    icon: "people",
    title: "কর্মী ও শিফট পরিচালনা",
    text: "কাউন্টার কর্মী তৈরি করুন, রোল ও পারমিশন নির্ধারণ করুন এবং সব কাউন্টারে কাজের সমন্বয় রাখুন।",
  },
  {
    icon: "report",
    title: "এক ক্লিকে রিপোর্ট",
    text: "প্রয়োজনমতো যেকোনো মুহূর্তে তৈরি করুন বিক্রয়, মুনাফা, ভ্যাট ও পারচেজের নির্ভুল রিপোর্ট।",
  },
  {
    icon: "cloud",
    title: "সুরক্ষিত ক্লাউড অ্যাক্সেস",
    text: "যেকোনো ডিভাইস থেকে যেকোনো সময় সম্পূর্ণ নিরাপদে ও নির্ভরযোগ্যভাবে ফার্মেসি পরিচালনা করুন।",
  },
];

export function Features() {
  const { lang, t } = useLanguage();
  const featureList = lang === "bn" ? featuresBn : featuresEn;

  return (
    <section className="section features-section" id="features">
      <div className="container">
        <div className="section-heading centered">
          <div className="kicker">{t("featuresKicker")}</div>
          <h2>
            {t("featuresHeading1")}<em>{t("featuresHeading2")}</em>
          </h2>
          <p>
            {t("featuresSubtitle")}
          </p>
        </div>

        <div className="feature-grid">
          {featureList.map((feature, index) => (
            <article
              className={`feature-card feature-${index + 1}`}
              key={feature.title}
            >
              <div className="feature-icon">
                <Icon name={feature.icon} size={22} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              {index === 0 && (
                <div className="mini-inventory">
                  <div>
                    <span>{lang === "bn" ? "ওষুধ" : "Medicine"}</span>
                    <span>{lang === "bn" ? "স্টক" : "Stock"}</span>
                  </div>
                  <div>
                    <strong>Napa Extend</strong>
                    <span className="stock-ok">248</span>
                  </div>
                  <div>
                    <strong>Seclo 20mg</strong>
                    <span className="stock-low">12</span>
                  </div>
                  <div>
                    <strong>Maxpro 40mg</strong>
                    <span className="stock-ok">184</span>
                  </div>
                </div>
              )}
              {index === 1 && (
                <div className="expiry-visual">
                  <span>12</span>
                  <div>
                    <strong>{lang === "bn" ? "মেয়াদোত্তীর্ণ অ্যালার্ট" : "Expiry alerts"}</strong>
                    <small>{lang === "bn" ? "আগামী ৩০ দিন" : "Next 30 days"}</small>
                  </div>
                  <i>−24%</i>
                </div>
              )}
              {index === 2 && (
                <div className="bars">
                  {[34, 52, 45, 72, 61, 88, 76, 96].map((height, i) => (
                    <i key={i} style={{ height: `${height}%` }} />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
