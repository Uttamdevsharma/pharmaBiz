"use client";

import React, { useRef, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Icon } from "./LandingIcons";

function DashboardScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateScale = () => {
      if (!wrapRef.current) return;
      const availableWidth = wrapRef.current.offsetWidth;
      if (availableWidth < 710) {
        const padding = availableWidth < 400 ? 8 : 16;
        const newScale = Math.min(1, Math.max(0.40, (availableWidth - padding) / 700));
        wrapRef.current.style.setProperty("--scene-scale", newScale.toFixed(3));
      } else {
        wrapRef.current.style.removeProperty("--scene-scale");
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleSceneMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth <= 800) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.style.setProperty("--scene-x", `${x * 18}px`);
    scene.style.setProperty("--scene-y", `${y * 14}px`);
    scene.style.setProperty("--scene-x-neg", `${x * -18}px`);
    scene.style.setProperty("--scene-y-neg", `${y * -14}px`);
    scene.style.setProperty("--scene-rx", `${y * -2.5}deg`);
    scene.style.setProperty("--scene-ry", `${x * 3.5}deg`);
  };

  const resetScene = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--scene-x", "0px");
    scene.style.setProperty("--scene-y", "0px");
    scene.style.setProperty("--scene-x-neg", "0px");
    scene.style.setProperty("--scene-y-neg", "0px");
    scene.style.setProperty("--scene-rx", "0deg");
    scene.style.setProperty("--scene-ry", "0deg");
  };

  return (
    <div className="scene-wrapper" ref={wrapRef}>
      <div
        className="scene"
        ref={sceneRef}
        onPointerMove={handleSceneMove}
        onPointerLeave={resetScene}
        aria-label="Interactive BizPharma analytics dashboard preview"
      >
        <div className="scene-glow" />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit-dot orbit-dot-one"><span /></div>
        <div className="orbit-dot orbit-dot-two"><span /></div>

        <div className="medicine-bottle" aria-hidden="true">
          <div className="bottle-cap"><i /><i /><i /><i /></div>
          <div className="bottle-neck" />
          <div className="bottle-body">
            <div className="bottle-label">
              <strong>NAPA</strong>
              <small>Paracetamol</small>
              <span className="bottle-dose">Syrup 60 ml</span>
            </div>
            <div className="bottle-shine" />
          </div>
          <div className="bottle-shadow" />
        </div>

        <div className="capsule capsule-one" aria-hidden="true"><i /><b /></div>
        <div className="capsule capsule-two" aria-hidden="true"><i /><b /></div>

        <div className="blister-pack" aria-hidden="true">
          <div className="blister-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index}><i /></span>
            ))}
          </div>
          <div className="blister-shine" />
        </div>

        <div className="dashboard-card">
          <div className="dash-sidebar">
            <div className="mini-logo"><span /></div>
            {["grid", "line", "bag", "user"].map((item, index) => (
              <span className={`side-icon ${index === 0 ? "active" : ""}`} key={item}>
                {index === 0 ? (
                  <Icon name="chart" size={15} />
                ) : index === 1 ? (
                  <Icon name="report" size={15} />
                ) : index === 2 ? (
                  <Icon name="box" size={15} />
                ) : (
                  <Icon name="people" size={15} />
                )}
              </span>
            ))}
          </div>
          <div className="dash-main">
            <div className="dash-top">
              <div>
                <small>Overview</small>
                <strong>Live Monitor</strong>
              </div>
              <div className="dash-avatar">AR</div>
            </div>
            <div className="metric-row">
              <div className="metric">
                <span>Today’s sales</span>
                <strong>৳ 84,250</strong>
                <small className="up">↗ 12.4%</small>
              </div>
              <div className="metric">
                <span>Orders</span>
                <strong>148</strong>
                <small>Completed today</small>
              </div>
              <div className="metric">
                <span>Low stock</span>
                <strong>16</strong>
                <small className="warn">Needs attention</small>
              </div>
            </div>
            <div className="dash-grid">
              <div className="chart-panel">
                <div className="panel-title">
                  <div>
                    <small>Sales analytics</small>
                    <strong>৳ 3,48,650</strong>
                  </div>
                  <span>7 days</span>
                </div>
                <svg className="sales-chart" viewBox="0 0 360 126" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#18a474" stopOpacity=".35" />
                      <stop offset="100%" stopColor="#18a474" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path className="gridline" d="M0 25H360M0 62H360M0 99H360" />
                  <path
                    className="area"
                    d="M0 96C28 88 36 48 68 58s38 31 70 15 44-53 75-42 39 57 72 43 40-50 75-60v112H0Z"
                  />
                  <path
                    className="line"
                    d="M0 96C28 88 36 48 68 58s38 31 70 15 44-53 75-42 39 57 72 43 40-50 75-60"
                  />
                </svg>
                <div className="chart-labels">
                  <span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
                </div>
              </div>
              <div className="stock-panel">
                <div className="panel-title">
                  <div>
                    <small>Stock health</small>
                    <strong>2,840 items</strong>
                  </div>
                </div>
                <div className="donut-wrap">
                  <div className="donut">
                    <div>
                      <strong>86%</strong>
                      <small>Healthy</small>
                    </div>
                  </div>
                </div>
                <div className="legend">
                  <span><i className="green" /> In stock</span>
                  <span><i className="amber" /> Low stock</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="float-card float-sale">
          <span className="float-icon"><Icon name="chart" size={18} /></span>
          <div><small>Today’s profit</small><strong>৳ 18,420</strong></div>
          <span className="float-up">+14%</span>
        </div>
        <div className="float-card float-alert">
          <span className="float-icon amber-icon"><Icon name="clock" size={18} /></span>
          <div><small>Expiry alert</small><strong>8 items this week</strong></div>
        </div>
        <div className="float-pill"><span><Icon name="shield" size={15} /></span> Cloud secured</div>
        <div className="scene-live"><i /> Live dashboard</div>
        <div className="scene-hint"><span>Move to explore</span><i /></div>
      </div>
    </div>
  );
}

export function Hero() {
  const { lang, t } = useLanguage();

  return (
    <section className="hero">
      <div className="hero-grid-bg" />
      <div className="container hero-content">
        <div className="hero-copy">
          <h1 className="reveal hero-title">
            <span className={`hero-title-main ${lang === "bn" ? "hero-title-bn" : ""}`}>{t("heroTitle1")}</span>
            <em className={`hero-title-sub ${lang === "bn" ? "hero-title-sub-bn" : ""}`}>{t("heroTitle2")}</em>
          </h1>
          <p className="hero-lead reveal delay-1">
            {t("heroLead")}
          </p>
          <div className="hero-actions reveal delay-2">
            <Link className="button button-primary button-large" href="/register">
              {t("heroRegister")} <Icon name="arrow" size={15} />
            </Link>
            <a className="watch-link" href="#how-it-works">
              <span><Icon name="play" size={18} /></span> {t("heroSeeHow")}
            </a>
          </div>
          <div className="hero-note reveal delay-3">
            <span><Icon name="check" size={15} /> {t("heroNoCard")}</span>
            <span><Icon name="check" size={15} /> {t("heroFastSetup")}</span>
            <span><Icon name="check" size={15} /> {t("heroCancelAnytime")}</span>
          </div>
        </div>
        <DashboardScene />
      </div>
      <div className="hero-bottom-fade" />
    </section>
  );
}
