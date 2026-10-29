# Task Engine API | SaaS Simulation Platform

> A professional Task Management SaaS backend built with Python & Django REST Framework, featuring a decoupled architecture, JWT security, and Docker support.

---

## Project Purpose
The primary goal of this project is to build a production-ready SaaS backend architecture, establish secure token-based authentication, and prepare a scalable REST API to integrate with a modern frontend (Vercel) in a decoupled ecosystem.

---

## Features & What We Built (v1.0.0)

* **Robust REST API Architecture:** Built with Django REST Framework (DRF) following modular and scalable design patterns.
* **Advanced Data Models:** Tasks structured with properties like `priority` (LOW, MEDIUM, HIGH), `status` (TODO, IN_PROGRESS, DONE), and strict `User` ownership.
* **Filtering, Search & Pagination:** Fully integrated with `django-filter`, `SearchFilter`, and `OrderingFilter` for seamless data querying.
* **JWT Authentication & Security:** Secured with `rest_framework_simplejwt` for login, token handling, and custom object-level permissions (`IsOwner`).
* **Interactive API Docs:** Powered by `drf-spectacular` for Swagger UI and OpenAPI documentation.
* **Dockerized Environment:** Fully containerized with a custom `Dockerfile` optimized with necessary system build dependencies (`gcc`, `libpq-dev`).

---

## Tech Stack
* **Framework:** Python / Django & Django REST Framework
* **Database:** PostgreSQL / SQLite
* **Authentication:** JWT (JSON Web Tokens)
* **DevOps:** Docker

---

## Roadmap

1. **Cloud Deployment:** Deploy the Dockerized API to **Render** for 24/7 availability.
2. **Modern Frontend:** Build a sleek frontend containing a Landing Page, Pricing Table, and Dashboard.
3. **Vercel Hosting:** Deploy the frontend on **Vercel** with global CDN distribution.
4. **SaaS Subscription Flow:** Integrate a simulated tier upgrade (Free vs. Pro Plan) and credit card checkout flow.

<img width="4534" height="3167" alt="Task_engine_ERD" src="https://github.com/user-attachments/assets/26eb7171-67c2-46f5-8aaf-68b5812eca39" />



---
*Developed by [Ozan İçel](https://github.com/ozanicel)*
