# 🌿 Ayur Sync – SIH 2025  

A next-gen API-driven platform to **integrate NAMASTE codes, WHO ICD-11 TM2, and Biomedicine** into FHIR-compliant EMR systems.  
Our solution empowers clinicians to seamlessly combine **Ayush diagnoses (Ayurveda, Siddha, Unani)** with **ICD-11 coding** for **interoperability, insurance, and global reporting**.  

![Ayur Sync Demo](assets/ayur.gif) <!-- Replace with actual GIF -->

---

## 🏆 Smart India Hackathon 2025  

- **Organization:** Ministry of Ayush  
- **Department:** All India Institute of Ayurveda (AIIA)  
- **Category:** Software  
- **Theme:** MedTech / BioTech / HealthTech  

---

## 📌 Problem Statement  

**ID:** 25026  
**Title:** Develop API code to integrate NAMASTE and/or ICD-11 (TM2) into EMR systems that comply with India’s EHR Standards.  

### 🔎 Background  
India’s Ayush sector is rapidly shifting to **digital health records**. To standardize this transition, EMR systems must support:  
- **NAMASTE codes** – 4,500+ standardized AYUSH terms  
- **ICD-11 (TM2 & Biomedicine)** – 529 disorders + 196 pattern codes  
- **EHR Standards (2016)** – FHIR R4 APIs, SNOMED CT, LOINC, ISO 22600, ABHA OAuth 2.0, audit trails  

### ❗ Problem  
Existing EMR vendors lack lightweight, FHIR-compliant plugins to **map NAMASTE ↔ ICD-11** codes, support **dual coding**, and provide **secure interoperability**.  

---

## 💡 Our Solution – Ayur Sync  

We propose **Ayur Sync**, a **lightweight FHIR microservice** that:  

- ✅ Ingests **NAMASTE CSV** & generates FHIR `CodeSystem` + `ConceptMap`  
- ✅ Fetches updates from **WHO ICD-11 API (TM2 + Biomedicine)**  
- ✅ Provides **REST endpoints** for:  
  - Auto-complete lookups (NAMASTE + ICD-11)  
  - Translation operations (**NAMASTE ↔ TM2**)  
  - Encounter uploads with **dual coding** in FHIR Bundles  
- ✅ Implements **OAuth 2.0 with ABHA** for secure access  
- ✅ Tracks versions, consent, and audit metadata (per EHR Standards)  
- ✅ Simple **Web Interface (React + Next.js)** for clinicians to:  
  - Search NAMASTE/ICD-11 terms  
  - View mapped codes  
  - Construct FHIR ProblemList entries  

---

## 👨‍👩‍👦 Team  

- **Team Name:** 🚀 *[Your Team Name Here]*  
- **Team Members:**  
  - Rohan Baiju
  - Dhiya K   
  - Srijan Srivasta
  - Joel Jo 
  - Ananya Y
  - Sruthi Subhash 

---

## 🛠 Tech Stack  

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/REST-02569B?style=for-the-badge&logo=swagger&logoColor=white"/>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black"/>
  <img src="https://img.shields.io/badge/VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white"/>
</p>  

---

## 🖼 UI Screenshots  

<p align="center">
  <img src="assets/ui1.png" width="30%" alt="UI Screenshot 1"/>
  <img src="assets/ui2.png" width="30%" alt="UI Screenshot 2"/>
  <img src="assets/ui3.png" width="30%" alt="UI Screenshot 3"/>
</p>  

---

## 📊 System Flow  

```mermaid
flowchart TD
    A[Frontend: React.js + Next.js Web App] -->|User Input| B[Backend: FastAPI + REST APIs - Dockerized]
    B --> C[Database: PostgreSQL]
    B --> D[Authentication: Custom JWT + OAuth 2.0]
    B --> E[Containerization: Docker]
    D --> F[Secure API Access Tokens]
    C --> G[Analytics & Reporting - Python Services]
    G --> A

    %% Node colors
    style A fill:#61DAFB,stroke:#000,stroke-width:2px,color:#000
    style B fill:#00C896,stroke:#000,stroke-width:2px,color:#fff
    style C fill:#F4A261,stroke:#000,stroke-width:2px,color:#000
    style D fill:#2E86AB,stroke:#000,stroke-width:2px,color:#fff
    style E fill:#2496ED,stroke:#000,stroke-width:2px,color:#fff
    style F fill:#8E44AD,stroke:#000,stroke-width:2px,color:#fff
    style G fill:#3776AB,stroke:#000,stroke-width:2px,color:#fff

