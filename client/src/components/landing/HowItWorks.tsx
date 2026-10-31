"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Icon, Logo } from "./LandingIcons";

export function HowItWorks() {
  const { lang, t } = useLanguage();

  return (
    <section className="section workflow-section" id="how-it-works">
      <div className="container workflow-grid">
        <div className="workflow-copy">
          <div className="kicker light">{t("howKicker")}</div>
          <h2>{t("howHeading")}</h2>
          <p>
            {t("howSubtitle")}
          </p>
          <div className="steps">
            {[
              ["01", t("howStep1Title"), t("howStep1Desc")],
              ["02", t("howStep2Title"), t("howStep2Desc")],
              ["03", t("howStep3Title"), t("howStep3Desc")],
            ].map(([number, title, text]) => (
              <div className="step" key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <Link className="button button-white" href="/register">
            {t("getStarted")} <Icon name="arrow" />
          </Link>
        </div>

        <div className="workflow-visual">
          <div className="phone-card">
            <div className="phone-top">
              <Logo light />
              <span className="avatar-small">BP</span>
            </div>
            <div className="phone-welcome">
              <small>{lang === "bn" ? "স্বাগতম" : "Welcome back"}</small>
            </div>
            <div className="phone-total">
              <span>{lang === "bn" ? "আজকের বিক্রি" : "Today’s sales"}</span>
              <strong>৳ 84,250</strong>
              <i>+12.4%</i>
            </div>
            <div className="phone-quick">
              <span>
                <i><Icon name="barcode" /></i>
                {lang === "bn" ? "নতুন বিক্রি" : "New sale"}
              </span>
              <span>
                <i><Icon name="box" /></i>
                {lang === "bn" ? "ইনভেন্টরি" : "Inventory"}
              </span>
              <span>
                <i><Icon name="report" /></i>
                {lang === "bn" ? "রিপোর্ট" : "Reports"}
              </span>
            </div>
            <div className="phone-list">
              <div>
                <strong>{lang === "bn" ? "সাম্প্রতিক বিক্রি" : "Recent sales"}</strong>
                <small>{lang === "bn" ? "সব দেখুন" : "View all"}</small>
              </div>
              {["Invoice #1842", "Invoice #1841", "Invoice #1840"].map((item, i) => (
                <div key={item}>
                  <span className="receipt">
                    <Icon name="report" size={14} />
                  </span>
                  <p>
                    <strong>{lang === "bn" ? item.replace("Invoice", "চালান") : item}</strong>
                    <small>{i + 2} {lang === "bn" ? "টি আইটেম · এইমাত্র" : "items · just now"}</small>
                  </p>
                  <b>৳ {["1,850", "980", "2,240"][i]}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="scan-beam" />
          <div className="workflow-float wf-one">
            <span><Icon name="check" size={16} /></span>
            <div>
              <strong>{lang === "bn" ? "ইনভেন্টরি যুক্ত হয়েছে" : "Inventory imported"}</strong>
              <small>{lang === "bn" ? "২,৮৪০টি পণ্য যুক্ত হয়েছে" : "2,840 products added"}</small>
            </div>
          </div>
          <div className="workflow-float wf-two">
            <span><Icon name="cloud" size={16} /></span>
            <div>
              <strong>{lang === "bn" ? "ডেটা সিঙ্ক হয়েছে" : "Data synced"}</strong>
              <small>{lang === "bn" ? "এইমাত্র" : "Just now"}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
