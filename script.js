"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL = "/api/students";
const LOGIN_URL = "/api/login";
const LOGOUT_URL = "/api/logout";


/* =========================================================
   GLOBAL STATE
========================================================= */

let students = [];
let currentUser = null;
let currentModalStudent = null;
let studentToDelete = null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   ROLE HELPERS
========================================================= */

function isAdmin() {

    return currentUser &&
        String(currentUser.role).toLowerCase() === "admin";
}


function isUser() {

    return currentUser &&
        String(currentUser.role).toLowerCase() === "user";
}


function requireAdmin() {

    if (!isAdmin()) {

        alert("Administrator access required.");

        return false;
    }

    return true;
}


/* =========================================================
   AUTHENTICATION HELPERS
========================================================= */

function getAuthToken() {

    if (!currentUser) {
        return null;
    }

    return currentUser.token || null;
}


function getAuthHeaders(includeJson = false) {

    const headers = {};

    if (includeJson) {

        headers["Content-Type"] =
            "application/json";
    }

    const token = getAuthToken();

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    return headers;
}


/* =========================================================
   AUTHORIZED FETCH
========================================================= */

async function authorizedFetch(
    url,
    options = {}
) {

    const finalOptions = {
        ...options,
        headers: {
            ...getAuthHeaders(
                options.body !== undefined
            ),
            ...(options.headers || {})
        }
    };


    const response =
        await fetch(
            url,
            finalOptions
        );


    /* =====================================================
       TOKEN INVALID / SESSION EXPIRED
    ===================================================== */

    if (response.status === 401) {

        handleAuthenticationFailure();

        throw new Error(
            "Authentication required."
        );
    }


    return response;
}


/* =========================================================
   AUTHENTICATION FAILURE
========================================================= */

function handleAuthenticationFailure() {

    currentUser = null;

    students = [];

    sessionStorage.removeItem(
        "studentManagementUser"
    );

    showLoginPage();

    const message =
        $("loginMessage");

    if (message) {

        message.textContent =
            "Your session has expired. Please login again.";
    }
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupLogin();
        setupNavigation();
        setupStudentControls();
        setupAddStudent();
        setupReportControls();
        setupModalControls();
        setupEditControls();
        setupDeleteControls();
        setupLogout();
        setupPasswordToggle();
        setupSettings();

        initializeApplication();
    }
);


/* =========================================================
   APPLICATION INITIALIZATION
========================================================= */

function initializeApplication() {

    const savedUser =
        sessionStorage.getItem(
            "studentManagementUser"
        );


    if (!savedUser) {

        showLoginPage();

        return;
    }


    try {

        currentUser =
            JSON.parse(savedUser);


        if (
            !currentUser ||
            !currentUser.username ||
            !currentUser.role ||
            !currentUser.token
        ) {

            throw new Error(
                "Invalid authentication session."
            );
        }


        showDashboard();


    } catch (error) {

        console.error(
            "Session error:",
            error
        );


        currentUser = null;


        sessionStorage.removeItem(
            "studentManagementUser"
        );


        showLoginPage();
    }
}


/* =========================================================
   LOGIN
========================================================= */

function setupLogin() {

    const form =
        $("loginForm");


    if (!form) return;


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                $("username")?.value.trim();


            const password =
                $("password")?.value;


            const message =
                $("loginMessage");


            if (!username || !password) {

                if (message) {

                    message.textContent =
                        "Please enter username and password.";
                }

                return;
            }


            if (message) {

                message.textContent =
                    "Signing in...";
            }


            const loginButton =
                $("loginButton");


            if (loginButton) {

                loginButton.disabled = true;
            }


            try {

                const response =
                    await fetch(
                        LOGIN_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username:
                                        username,

                                    password:
                                        password
                                })
                        }
                    );


                let data = null;


                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    data = null;
                }


                if (
                    !response.ok ||
                    !data ||
                    !data.success ||
                    !data.token
                ) {

                    const errorMessage =
                        data?.message ||
                        "Invalid username or password.";

                    throw new Error(
                        errorMessage
                    );
                }


                /* =========================================
                   STORE SERVER AUTHENTICATION
                ========================================= */

                currentUser = {

                    username:
                        data.username,

                    role:
                        data.role,

                    token:
                        data.token
                };


                sessionStorage.setItem(
                    "studentManagementUser",
                    JSON.stringify(currentUser)
                );


                if (message) {

                    message.textContent =
                        "";
                }


                if ($("password")) {

                    $("password").value =
                        "";
                }


                await showDashboard();


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                if (message) {

                    message.textContent =
                        error.message ||
                        "Unable to login.";
                }


                currentUser = null;


                sessionStorage.removeItem(
                    "studentManagementUser"
                );


            } finally {

                if (loginButton) {

                    loginButton.disabled =
                        false;
                }
            }
        }
    );
}


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLoginPage() {

    $("loginPage")?.classList.remove(
        "hidden"
    );


    $("dashboardPage")?.classList.add(
        "hidden"
    );


    /* Close any open modal */

    $("studentModal")?.classList.add(
        "hidden"
    );

    $("editStudentModal")?.classList.add(
        "hidden"
    );

    $("deleteConfirmModal")?.classList.add(
        "hidden"
    );
}


/* =========================================================
   SHOW DASHBOARD
========================================================= */

async function showDashboard() {

    $("loginPage")?.classList.add(
        "hidden"
    );


    $("dashboardPage")?.classList.remove(
        "hidden"
    );


    updateUserInterface();

    setCurrentDate();


    await loadStudents();


    /*
     * loadStudents() can detect a 401
     * and return the user to login.
     */

    if (!currentUser) {

        return;
    }


    showSection(
        "dashboardSection"
    );
}


/* =========================================================
   USER INTERFACE / ROLE CONTROL
========================================================= */

function updateUserInterface() {

    if (!currentUser) return;


    const username =
        currentUser.username || "";


    const role =
        String(
            currentUser.role || ""
        ).toLowerCase();


    const displayRole =
        role === "admin"
            ? "Administrator"
            : "User";


    const initials =
        username
            .substring(0, 1)
            .toUpperCase();


    if ($("currentUsername"))
        $("currentUsername").textContent =
            username;


    if ($("currentRole"))
        $("currentRole").textContent =
            displayRole;


    if ($("welcomeName"))
        $("welcomeName").textContent =
            username;


    if ($("settingsUsername"))
        $("settingsUsername").textContent =
            username;


    if ($("settingsRole"))
        $("settingsRole").textContent =
            displayRole;


    if ($("sidebarUsername"))
        $("sidebarUsername").textContent =
            username;


    if ($("sidebarRole"))
        $("sidebarRole").textContent =
            displayRole;


    if ($("sidebarUserInitial"))
        $("sidebarUserInitial").textContent =
            initials;


    if ($("topbarUserInitial"))
        $("topbarUserInitial").textContent =
            initials;


    if ($("settingsAvatarInitial"))
        $("settingsAvatarInitial").textContent =
            initials;


    /* =====================================================
       ADMIN-ONLY ELEMENTS
    ===================================================== */

    const adminElements =
        document.querySelectorAll(
            ".admin-only"
        );


    adminElements.forEach(
        element => {

            if (isAdmin()) {

                element.classList.remove(
                    "hidden"
                );

                element.style.display =
                    "";

            } else {

                element.classList.add(
                    "hidden"
                );

                element.style.display =
                    "none";
            }
        }
    );


    /* =====================================================
       USER-ONLY ELEMENTS
    ===================================================== */

    const userElements =
        document.querySelectorAll(
            ".user-only"
        );


    userElements.forEach(
        element => {

            if (isUser()) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );
            }
        }
    );


    /* =====================================================
       SETTINGS NAVIGATION
    ===================================================== */

    const settingsNav =
        document.querySelector(
            '[data-section="settingsSection"]'
        );


    if (settingsNav) {

        if (isAdmin()) {

            settingsNav.classList.remove(
                "hidden"
            );

            settingsNav.style.display =
                "";

        } else {

            settingsNav.classList.add(
                "hidden"
            );

            settingsNav.style.display =
                "none";
        }
    }


    /* =====================================================
       ADD STUDENT NAVIGATION
    ===================================================== */

    const addNav =
        document.querySelector(
            '[data-section="addStudentSection"]'
        );


    if (addNav) {

        if (isAdmin()) {

            addNav.classList.remove(
                "hidden"
            );

            addNav.style.display =
                "";

        } else {

            addNav.classList.add(
                "hidden"
            );

            addNav.style.display =
                "none";
        }
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            "[data-section]"
        );


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const section =
                        item.getAttribute(
                            "data-section"
                        );


                    if (!section) return;


                    /* ADMIN PROTECTION */

                    if (
                        section ===
                            "addStudentSection" &&
                        !isAdmin()
                    ) {

                        alert(
                            "Only administrators can add students."
                        );

                        return;
                    }


                    if (
                        section ===
                            "settingsSection" &&
                        !isAdmin()
                    ) {

                        alert(
                            "Only administrators can access Settings."
                        );

                        return;
                    }


                    showSection(
                        section
                    );
                }
            );
        }
    );
}


function showSection(sectionId) {

    const sections =
        document.querySelectorAll(
            ".dashboard-section"
        );


    sections.forEach(
        section => {

            section.classList.add(
                "hidden"
            );
        }
    );


    const target =
        $(sectionId);


    if (target) {

        target.classList.remove(
            "hidden"
        );
    }


    updatePageHeader(
        sectionId
    );


    closeSidebarOnMobile();


    if (
        sectionId ===
        "dashboardSection"
    ) {

        updateDashboard();
    }


    if (
        sectionId ===
        "studentsSection"
    ) {

        renderStudents();
    }


    if (
        sectionId ===
        "reportsSection"
    ) {

        updateReports();
    }
}


/* =========================================================
   PAGE HEADER
========================================================= */

function updatePageHeader(
    sectionId
) {

    const title =
        $("pageTitle");


    const subtitle =
        $("pageSubtitle");


    const headers = {

        dashboardSection: [
            "Dashboard",
            "Overview of your student management system"
        ],

        studentsSection: [
            "Students",
            "View and manage student records"
        ],

        addStudentSection: [
            "Add Student",
            "Create a new student record"
        ],

        reportsSection: [
            "Reports & Analytics",
            "Analyze student performance"
        ],

        settingsSection: [
            "Settings",
            "Manage your administrator account"
        ]
    };


    const data =
        headers[sectionId];


    if (!data) return;


    if (title)
        title.textContent =
            data[0];


    if (subtitle)
        subtitle.textContent =
            data[1];
}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    try {

        const response =
            await authorizedFetch(
                API_URL,
                {
                    method: "GET"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load students."
            );
        }


        const data =
            await response.json();


        students =
            Array.isArray(data)
                ? data.map(
                    normalizeStudent
                )
                : [];


        renderStudents();

        updateDashboard();

        updateReports();


    } catch (error) {

        console.error(
            "Load students error:",
            error
        );


        /*
         * If authentication failed,
         * authorizedFetch already redirected.
         */

        if (!currentUser) {

            return;
        }


        students = [];


        renderStudents();

        updateDashboard();

        updateReports();
    }
}


/* =========================================================
   NORMALIZE STUDENT
========================================================= */

function normalizeStudent(student) {

    const marks =
        Number(
            student.marks || 0
        );


    return {

        id:
            Number(
                student.id || 0
            ),

        name:
            String(
                student.name || ""
            ),

        age:
            Number(
                student.age || 0
            ),

        branch:
            String(
                student.branch || ""
            ),

        marks:
            marks,

        rollNo:
            Number(
                student.rollNo || 0
            ),

        grade:
            student.grade ||
            calculateGrade(marks),

        status:
            student.status ||
            calculateStatus(marks)
    };
}


/* =========================================================
   GRADE
========================================================= */

function calculateGrade(marks) {

    marks =
        Number(marks);


    if (marks >= 90)
        return "A+";

    if (marks >= 80)
        return "A";

    if (marks >= 70)
        return "B+";

    if (marks >= 60)
        return "B";

    if (marks >= 50)
        return "C";

    if (marks >= 40)
        return "D";


    return "F";
}


/* =========================================================
   STATUS
========================================================= */

function calculateStatus(marks) {

    return Number(marks) >= 40
        ? "PASS"
        : "FAIL";
}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const total =
        students.length;


    const passed =
        students.filter(
            student =>
                student.status === "PASS"
        ).length;


    const failed =
        total - passed;


    const average =
        total
            ? students.reduce(
                (sum, student) =>
                    sum +
                    Number(
                        student.marks
                    ),
                0
            ) / total
            : 0;


    if ($("totalStudents"))
        $("totalStudents").textContent =
            total;


    if ($("passedStudents"))
        $("passedStudents").textContent =
            passed;


    if ($("failedStudents"))
        $("failedStudents").textContent =
            failed;


    if ($("averageMarks"))
        $("averageMarks").textContent =
            average.toFixed(2);


    renderRecentStudents();
}


/* =========================================================
   RECENT STUDENTS
========================================================= */

function renderRecentStudents() {

    const body =
        $("recentStudentsTable");


    if (!body) return;


    body.innerHTML =
        "";


    students
        .slice(-5)
        .reverse()
        .forEach(
            student => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHtml(student.id)}
                    </td>

                    <td>
                        ${escapeHtml(student.name)}
                    </td>

                    <td>
                        ${escapeHtml(student.branch)}
                    </td>

                    <td>
                        ${student.marks.toFixed(2)}
                    </td>

                    <td>
                        ${escapeHtml(student.grade)}
                    </td>
                `;


                body.appendChild(row);
            }
        );
}


/* =========================================================
   STUDENT CONTROLS
========================================================= */

function setupStudentControls() {

    $("studentSearch")?.addEventListener(
        "input",
        renderStudents
    );


    $("sortStudents")?.addEventListener(
        "change",
        renderStudents
    );
}


/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {

    const body =
        $("studentsTableBody");


    if (!body) return;


    const search =
        (
            $("studentSearch")?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const sort =
        $("sortStudents")?.value ||
        "id";


    let filtered =
        students.filter(
            student => {

                const fields = [

                    student.id,
                    student.name,
                    student.rollNo,
                    student.branch,
                    student.age,
                    student.marks
                ];


                return fields.some(
                    value =>
                        String(value)
                            .toLowerCase()
                            .includes(search)
                );
            }
        );


    filtered.sort(
        (a, b) => {

            switch (sort) {

                case "name":

                    return a.name.localeCompare(
                        b.name
                    );


                case "marks":

                    return b.marks -
                        a.marks;


                case "rollNo":

                    return a.rollNo -
                        b.rollNo;


                default:

                    return a.id -
                        b.id;
            }
        }
    );


    body.innerHTML =
        "";


    filtered.forEach(
        student => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(student.id)}
                </td>

                <td>
                    ${escapeHtml(student.name)}
                </td>

                <td>
                    ${escapeHtml(student.rollNo)}
                </td>

                <td>
                    ${escapeHtml(student.branch)}
                </td>

                <td>
                    ${escapeHtml(student.age)}
                </td>

                <td>
                    ${student.marks.toFixed(2)}
                </td>

                <td>
                    <span class="grade-badge">
                        ${escapeHtml(student.grade)}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${
                        student.status === "PASS"
                            ? "pass"
                            : "fail"
                    }">
                        ${escapeHtml(student.status)}
                    </span>
                </td>

                <td>

                    <button
                        class="view-btn"
                        onclick="viewStudent(${student.id})">
                        View
                    </button>

                    ${
                        isAdmin()
                        ? `
                            <button
                                class="edit-btn admin-only"
                                onclick="editStudent(${student.id})">
                                Edit
                            </button>

                            <button
                                class="delete-btn admin-only"
                                onclick="deleteStudent(${student.id})">
                                Delete
                            </button>
                        `
                        : ""
                    }

                </td>
            `;


            body.appendChild(row);
        }
    );


    if ($("studentCount")) {

        $("studentCount").textContent =
            `${filtered.length} student${
                filtered.length === 1
                    ? ""
                    : "s"
            }`;
    }
}


/* =========================================================
   ADD STUDENT
========================================================= */

function setupAddStudent() {

    const form =
        $("addStudentForm");


    if (!form) return;


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!requireAdmin())
                return;


            const student = {

                id:
                    Number(
                        $("studentId")?.value
                    ),

                name:
                    $("studentName")
                        ?.value
                        .trim(),

                age:
                    Number(
                        $("studentAge")?.value
                    ),

                branch:
                    $("studentBranch")
                        ?.value
                        .trim(),

                marks:
                    Number(
                        $("studentMarks")?.value
                    ),

                rollNo:
                    Number(
                        $("rollNo")?.value
                    )
            };


            if (
                !student.id ||
                !student.name ||
                !student.age ||
                !student.branch ||
                isNaN(student.marks) ||
                !student.rollNo
            ) {

                showMessage(
                    "addStudentMessage",
                    "Please fill all fields."
                );

                return;
            }


            if (
                student.marks < 0 ||
                student.marks > 100
            ) {

                showMessage(
                    "addStudentMessage",
                    "Marks must be between 0 and 100."
                );

                return;
            }


            try {

                const response =
                    await authorizedFetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    student
                                )
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        await response.text()
                    );
                }


                showMessage(
                    "addStudentMessage",
                    "Student added successfully.",
                    true
                );


                form.reset();


                await loadStudents();


            } catch (error) {

                console.error(
                    "Add student error:",
                    error
                );


                if (!currentUser)
                    return;


                showMessage(
                    "addStudentMessage",
                    error.message ||
                    "Unable to add student."
                );
            }
        }
    );
}


/* =========================================================
   VIEW STUDENT
========================================================= */

window.viewStudent =
    function(id) {

        const student =
            students.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!student) return;


        currentModalStudent =
            student;


        if ($("modalTitle"))
            $("modalTitle").textContent =
                student.name;


        if ($("modalBody")) {

            $("modalBody").innerHTML = `

                <div class="student-detail">
                    <strong>Student ID</strong>
                    <span>
                        ${escapeHtml(student.id)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Name</strong>
                    <span>
                        ${escapeHtml(student.name)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Roll Number</strong>
                    <span>
                        ${escapeHtml(student.rollNo)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Age</strong>
                    <span>
                        ${escapeHtml(student.age)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Branch</strong>
                    <span>
                        ${escapeHtml(student.branch)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Marks</strong>
                    <span>
                        ${student.marks.toFixed(2)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Grade</strong>
                    <span>
                        ${escapeHtml(student.grade)}
                    </span>
                </div>

                <div class="student-detail">
                    <strong>Status</strong>
                    <span>
                        ${escapeHtml(student.status)}
                    </span>
                </div>
            `;
        }


        $("studentModal")
            ?.classList.remove(
                "hidden"
            );
    };


/* =========================================================
   EDIT STUDENT
========================================================= */

window.editStudent =
    function(id) {

        if (!requireAdmin())
            return;


        const student =
            students.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!student) return;


        $("editStudentId").value =
            student.id;


        $("editStudentIdDisplay").textContent =
            student.id;


        $("editStudentName").value =
            student.name;


        $("editRollNo").value =
            student.rollNo;


        $("editStudentAge").value =
            student.age;


        $("editStudentBranch").value =
            student.branch;


        $("editStudentMarks").value =
            student.marks;


        updateEditPreview();


        $("editStudentModal")
            ?.classList.remove(
                "hidden"
            );
    };


/* =========================================================
   EDIT CONTROLS
========================================================= */

function setupEditControls() {

    $("editStudentMarks")?.addEventListener(
        "input",
        updateEditPreview
    );


    $("editStudentForm")?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!requireAdmin())
                return;


            const id =
                Number(
                    $("editStudentId")
                        ?.value
                );


            const student = {

                id: id,

                name:
                    $("editStudentName")
                        ?.value
                        .trim(),

                age:
                    Number(
                        $("editStudentAge")
                            ?.value
                    ),

                branch:
                    $("editStudentBranch")
                        ?.value
                        .trim(),

                marks:
                    Number(
                        $("editStudentMarks")
                            ?.value
                    ),

                rollNo:
                    Number(
                        $("editRollNo")
                            ?.value
                    )
            };


            if (
                !student.name ||
                !student.age ||
                !student.branch ||
                !student.rollNo ||
                isNaN(student.marks)
            ) {

                showMessage(
                    "editStudentMessage",
                    "Please fill all fields."
                );

                return;
            }


            if (
                student.marks < 0 ||
                student.marks > 100
            ) {

                showMessage(
                    "editStudentMessage",
                    "Marks must be between 0 and 100."
                );

                return;
            }


            try {

                const response =
                    await authorizedFetch(
                        `${API_URL}?id=${id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    student
                                )
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        await response.text()
                    );
                }


                $("editStudentModal")
                    ?.classList.add(
                        "hidden"
                    );


                await loadStudents();


            } catch (error) {

                console.error(
                    "Edit student error:",
                    error
                );


                if (!currentUser)
                    return;


                showMessage(
                    "editStudentMessage",
                    error.message ||
                    "Unable to update student."
                );
            }
        }
    );


    $("cancelEditButton")
        ?.addEventListener(
            "click",
            () => {

                $("editStudentModal")
                    ?.classList.add(
                        "hidden"
                    );
            }
        );


    $("closeEditModal")
        ?.addEventListener(
            "click",
            () => {

                $("editStudentModal")
                    ?.classList.add(
                        "hidden"
                    );
            }
        );
}


/* =========================================================
   EDIT PREVIEW
========================================================= */

function updateEditPreview() {

    const marks =
        Number(
            $("editStudentMarks")
                ?.value || 0
        );


    const grade =
        calculateGrade(
            marks
        );


    const status =
        calculateStatus(
            marks
        );


    if ($("editPreviewGrade"))
        $("editPreviewGrade").textContent =
            grade;


    if ($("editPreviewStatus"))
        $("editPreviewStatus").textContent =
            status;
}


/* =========================================================
   DELETE STUDENT
========================================================= */

window.deleteStudent =
    function(id) {

        if (!requireAdmin())
            return;


        const student =
            students.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!student) return;


        studentToDelete =
            student;


        if ($("deleteStudentName"))
            $("deleteStudentName")
                .textContent =
                student.name;


        $("deleteConfirmModal")
            ?.classList.remove(
                "hidden"
            );
    };


/* =========================================================
   DELETE CONTROLS
========================================================= */

function setupDeleteControls() {

    $("cancelDeleteButton")
        ?.addEventListener(
            "click",
            () => {

                studentToDelete =
                    null;


                $("deleteConfirmModal")
                    ?.classList.add(
                        "hidden"
                    );
            }
        );


    $("confirmDeleteButton")
        ?.addEventListener(
            "click",
            async () => {

                if (!requireAdmin())
                    return;


                if (!studentToDelete)
                    return;


                const id =
                    studentToDelete.id;


                try {

                    const response =
                        await authorizedFetch(
                            `${API_URL}?id=${id}`,
                            {
                                method: "DELETE"
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            await response.text()
                        );
                    }


                    $("deleteConfirmModal")
                        ?.classList.add(
                            "hidden"
                        );


                    studentToDelete =
                        null;


                    await loadStudents();


                } catch (error) {

                    console.error(
                        "Delete student error:",
                        error
                    );


                    if (!currentUser)
                        return;


                    alert(
                        error.message ||
                        "Unable to delete student."
                    );
                }
            }
        );
}


/* =========================================================
   REPORT CONTROLS
========================================================= */

function setupReportControls() {

    $("reportSearch")?.addEventListener(
        "input",
        updateReports
    );


    $("reportBranchFilter")?.addEventListener(
        "change",
        updateReports
    );


    $("reportResultFilter")?.addEventListener(
        "change",
        updateReports
    );


    $("resetReportFilters")?.addEventListener(
        "click",
        () => {

            if ($("reportSearch"))
                $("reportSearch").value =
                    "";


            if ($("reportBranchFilter"))
                $("reportBranchFilter").value =
                    "all";


            if ($("reportResultFilter"))
                $("reportResultFilter").value =
                    "all";


            updateReports();
        }
    );


    $("printReportButton")
        ?.addEventListener(
            "click",
            printReport
        );
}


/* =========================================================
   REPORT FILTER
========================================================= */

function getReportFilteredStudents() {

    const search =
        (
            $("reportSearch")?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const branch =
        (
            $("reportBranchFilter")?.value ||
            "all"
        )
            .trim()
            .toLowerCase();


    const result =
        (
            $("reportResultFilter")?.value ||
            "all"
        )
            .trim()
            .toLowerCase();


    return students.filter(
        student => {

            const searchableFields = [

                student.id,
                student.rollNo,
                student.name,
                student.age,
                student.branch,
                student.marks,
                student.grade,
                student.status
            ];


            const matchesSearch =
                search === "" ||
                searchableFields.some(
                    value =>
                        String(
                            value ?? ""
                        )
                            .trim()
                            .toLowerCase()
                            .includes(search)
                );


            const matchesBranch =
                branch === "all" ||
                String(
                    student.branch ?? ""
                )
                    .trim()
                    .toLowerCase() ===
                    branch;


            const matchesResult =
                result === "all" ||
                String(
                    student.status ?? ""
                )
                    .trim()
                    .toLowerCase() ===
                    result;


            return (
                matchesSearch &&
                matchesBranch &&
                matchesResult
            );
        }
    );
}


/* =========================================================
   REPORTS
========================================================= */

function updateReports() {


const filtered =
    getReportFilteredStudents();


const total =
    filtered.length;


/* =====================================================
   MARKS
===================================================== */

const marks =
    filtered
        .map(student => Number(student.marks))
        .filter(mark => Number.isFinite(mark));


const average =
    marks.length
        ? marks.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / marks.length
        : 0;


const highest =
    marks.length
        ? Math.max(...marks)
        : 0;


const lowest =
    marks.length
        ? Math.min(...marks)
        : 0;


/* =====================================================
   HIGHEST / LOWEST STUDENTS
===================================================== */

let highestStudent = null;
let lowestStudent = null;


if (filtered.length > 0) {

    highestStudent =
        filtered.reduce(
            (best, student) => {

                return Number(student.marks) >
                    Number(best.marks)
                    ? student
                    : best;

            },
            filtered[0]
        );


    lowestStudent =
        filtered.reduce(
            (lowest, student) => {

                return Number(student.marks) <
                    Number(lowest.marks)
                    ? student
                    : lowest;

            },
            filtered[0]
        );
}


/* =====================================================
   PASS / FAIL
===================================================== */

const passed =
    filtered.filter(
        student =>
            String(student.status)
                .toUpperCase() ===
            "PASS"
    ).length;


const failed =
    total - passed;


const passPercentage =
    total
        ? (passed / total) * 100
        : 0;


const failPercentage =
    total
        ? (failed / total) * 100
        : 0;


/* =====================================================
   MAIN ANALYTICS CARDS
===================================================== */

if ($("reportTotalStudents"))
    $("reportTotalStudents").textContent =
        total;


if ($("reportAverageMarks"))
    $("reportAverageMarks").textContent =
        average.toFixed(2);


if ($("highestMarks"))
    $("highestMarks").textContent =
        highest.toFixed(2);


if ($("lowestMarks"))
    $("lowestMarks").textContent =
        lowest.toFixed(2);


/* =====================================================
   PASS / FAIL COUNTS
===================================================== */

if ($("analyticsPassedCount"))
    $("analyticsPassedCount").textContent =
        passed;


if ($("analyticsFailedCount"))
    $("analyticsFailedCount").textContent =
        failed;


if ($("analyticsPassTotal"))
    $("analyticsPassTotal").textContent =
        passed;


if ($("analyticsFailTotal"))
    $("analyticsFailTotal").textContent =
        failed;


/* =====================================================
   PASS / FAIL PERCENTAGES
===================================================== */

if ($("analyticsPassPercentage"))
    $("analyticsPassPercentage").textContent =
        passPercentage.toFixed(1) + "%";


if ($("analyticsFailPercentage"))
    $("analyticsFailPercentage").textContent =
        failPercentage.toFixed(1) + "%";


/* =====================================================
   PROGRESS BARS
===================================================== */

if ($("passProgressBar"))
    $("passProgressBar").style.width =
        `${passPercentage}%`;


if ($("failProgressBar"))
    $("failProgressBar").style.width =
        `${failPercentage}%`;


/* =====================================================
   PERFORMANCE LEADERBOARD
===================================================== */

if ($("analyticsHighestStudent")) {

    if (highestStudent) {

        $("analyticsHighestStudent").innerHTML = `
            <strong>
                ${escapeHtml(highestStudent.name)}
            </strong>

            <span>
                ${highestStudent.marks.toFixed(2)} marks
                · ${escapeHtml(highestStudent.grade)}
            </span>
        `;

    } else {

        $("analyticsHighestStudent").textContent =
            "No student data";
    }
}


if ($("analyticsLowestStudent")) {

    if (lowestStudent) {

        $("analyticsLowestStudent").innerHTML = `
            <strong>
                ${escapeHtml(lowestStudent.name)}
            </strong>

            <span>
                ${lowestStudent.marks.toFixed(2)} marks
                · ${escapeHtml(lowestStudent.grade)}
            </span>
        `;

    } else {

        $("analyticsLowestStudent").textContent =
            "No student data";
    }
}


/* =====================================================
   PERFORMANCE MESSAGE
===================================================== */

const performanceMessage =
    $("performanceMessage");


if (performanceMessage) {

    if (!total) {

        performanceMessage.textContent =
            "No student data available.";

    } else if (passPercentage >= 90) {

        performanceMessage.textContent =
            "Excellent performance! The overall pass rate is outstanding.";

    } else if (passPercentage >= 75) {

        performanceMessage.textContent =
            "Very good performance with a strong overall pass rate.";

    } else if (passPercentage >= 50) {

        performanceMessage.textContent =
            "Moderate performance. There is room for improvement.";

    } else {

        performanceMessage.textContent =
            "Performance needs attention. Consider additional academic support.";
    }
}


/* =====================================================
   RENDER REPORT COMPONENTS
===================================================== */

renderReportTable(
    filtered
);


renderTopStudents(
    filtered
);


renderBranchAnalytics(
    filtered
);


renderGradeDistribution(
    filtered
);


}



/* =========================================================
   REPORT TABLE
========================================================= */

function renderReportTable(data) {

    const body =
        $("reportsTableBody");


    if (!body) return;


    body.innerHTML =
        "";


    data.forEach(
        student => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(student.id)}
                </td>

                <td>
                    ${escapeHtml(student.name)}
                </td>

                <td>
                    ${escapeHtml(student.rollNo)}
                </td>

                <td>
                    ${escapeHtml(student.branch)}
                </td>

                <td>
                    ${student.marks.toFixed(2)}
                </td>

                <td>
                    ${escapeHtml(student.grade)}
                </td>

                <td>
                    ${escapeHtml(student.status)}
                </td>
            `;


            body.appendChild(row);
        }
    );
}


/* =========================================================
   TOP STUDENTS
========================================================= */

function renderTopStudents(data) {

    const body =
        $("topStudentsTableBody");


    if (!body) return;


    body.innerHTML =
        "";


    const top =
        [...data]
            .sort(
                (a, b) =>
                    b.marks -
                    a.marks
            )
            .slice(0, 5);


    top.forEach(
        (student, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHtml(student.name)}
                </td>

                <td>
                    ${escapeHtml(student.branch)}
                </td>

                <td>
                    ${student.marks.toFixed(2)}
                </td>

                <td>
                    ${escapeHtml(student.grade)}
                </td>
            `;


            body.appendChild(row);
        }
    );
}


/* =========================================================
   BRANCH ANALYTICS
========================================================= */

function renderBranchAnalytics(data) {

    const container =
        $("branchAnalytics");


    if (!container) return;


    const branches = {};


    data.forEach(
        student => {

            const branch =
                student.branch ||
                "Unknown";


            if (!branches[branch]) {

                branches[branch] = {

                    count: 0,
                    total: 0
                };
            }


            branches[branch].count++;


            branches[branch].total +=
                Number(
                    student.marks
                );
        }
    );


    container.innerHTML =
        "";


    Object.entries(branches)
        .forEach(
            ([branch, info]) => {

                const average =
                    info.total /
                    info.count;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "branch-card";


                card.innerHTML = `

                    <h3>
                        ${escapeHtml(branch)}
                    </h3>

                    <p>
                        Students:
                        <strong>
                            ${info.count}
                        </strong>
                    </p>

                    <p>
                        Average:
                        <strong>
                            ${average.toFixed(2)}
                        </strong>
                    </p>
                `;


                container.appendChild(
                    card
                );
            }
        );
}


/* =========================================================
   GRADE DISTRIBUTION
========================================================= */

function renderGradeDistribution(data) {

    const container =
        $("gradeDistribution");


    if (!container) return;


    const grades = {

        "A+": 0,
        "A": 0,
        "B+": 0,
        "B": 0,
        "C": 0,
        "D": 0,
        "F": 0
    };


    data.forEach(
        student => {

            if (
                grades[
                    student.grade
                ] !== undefined
            ) {

                grades[
                    student.grade
                ]++;
            }
        }
    );


    container.innerHTML =
        "";


    Object.entries(grades)
        .forEach(
            ([grade, count]) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "grade-item";


                item.innerHTML = `

                    <span>
                        ${escapeHtml(grade)}
                    </span>

                    <strong>
                        ${count}
                    </strong>
                `;


                container.appendChild(
                    item
                );
            }
        );
}


/* =========================================================
   MODALS
========================================================= */

function setupModalControls() {

    $("closeResultButton")
        ?.addEventListener(
            "click",
            () => {

                $("studentModal")
                    ?.classList.add(
                        "hidden"
                    );
            }
        );


    $("printResultButton")
        ?.addEventListener(
            "click",
            printStudent
        );


    window.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("studentModal")
            ) {

                $("studentModal")
                    ?.classList.add(
                        "hidden"
                    );
            }


            if (
                event.target ===
                $("editStudentModal")
            ) {

                $("editStudentModal")
                    ?.classList.add(
                        "hidden"
                    );
            }


            if (
                event.target ===
                $("deleteConfirmModal")
            ) {

                $("deleteConfirmModal")
                    ?.classList.add(
                        "hidden"
                    );
            }
        }
    );
}


/* =========================================================
   PRINT STUDENT
========================================================= */

function printStudent() {

    if (!currentModalStudent)
        return;


    const student =
        currentModalStudent;


    const printWindow =
        window.open(
            "",
            "_blank"
        );


    if (!printWindow) {

        alert(
            "Please allow popups to print."
        );

        return;
    }


    printWindow.document.write(`

        <html>

        <head>

            <title>
                Student Report
            </title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                }

                h1 {
                    margin-bottom: 25px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #ccc;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #f3f4f6;
                }

            </style>

        </head>

        <body>

            <h1>
                Student Report
            </h1>

            <table>

                <tr>
                    <th>Student ID</th>
                    <td>
                        ${escapeHtml(student.id)}
                    </td>
                </tr>

                <tr>
                    <th>Name</th>
                    <td>
                        ${escapeHtml(student.name)}
                    </td>
                </tr>

                <tr>
                    <th>Roll Number</th>
                    <td>
                        ${escapeHtml(student.rollNo)}
                    </td>
                </tr>

                <tr>
                    <th>Age</th>
                    <td>
                        ${escapeHtml(student.age)}
                    </td>
                </tr>

                <tr>
                    <th>Branch</th>
                    <td>
                        ${escapeHtml(student.branch)}
                    </td>
                </tr>

                <tr>
                    <th>Marks</th>
                    <td>
                        ${student.marks.toFixed(2)}
                    </td>
                </tr>

                <tr>
                    <th>Grade</th>
                    <td>
                        ${escapeHtml(student.grade)}
                    </td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>
                        ${escapeHtml(student.status)}
                    </td>
                </tr>

            </table>

        </body>

        </html>
    `);


    printWindow.document.close();

    printWindow.focus();


    setTimeout(
        () => {

            printWindow.print();

        },
        300
    );
}


/* =========================================================
   PRINT REPORT
========================================================= */

function printReport() {

    const data =
        getReportFilteredStudents();


    const printWindow =
        window.open(
            "",
            "_blank"
        );


    if (!printWindow) {

        alert(
            "Please allow popups to print."
        );

        return;
    }


    const rows =
        data.map(
            student => `

                <tr>

                    <td>
                        ${escapeHtml(student.id)}
                    </td>

                    <td>
                        ${escapeHtml(student.name)}
                    </td>

                    <td>
                        ${escapeHtml(student.rollNo)}
                    </td>

                    <td>
                        ${escapeHtml(student.branch)}
                    </td>

                    <td>
                        ${student.marks.toFixed(2)}
                    </td>

                    <td>
                        ${escapeHtml(student.grade)}
                    </td>

                    <td>
                        ${escapeHtml(student.status)}
                    </td>

                </tr>
            `
        )
        .join("");


    printWindow.document.write(`

        <html>

        <head>

            <title>
                Student Analytics Report
            </title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                }

                h1 {
                    margin-bottom: 20px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    text-align: left;
                }

                th {
                    background: #f3f4f6;
                }

            </style>

        </head>

        <body>

            <h1>
                Student Analytics Report
            </h1>

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Name</th>
                        <th>Roll No</th>
                        <th>Branch</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>Status</th>

                    </tr>

                </thead>

                <tbody>

                    ${rows}

                </tbody>

            </table>

        </body>

        </html>
    `);


    printWindow.document.close();

    printWindow.focus();


    setTimeout(
        () => {

            printWindow.print();

        },
        300
    );
}


/* =========================================================
   SETTINGS
========================================================= */

function setupSettings() {

    const settingsNav =
        document.querySelector(
            '[data-section="settingsSection"]'
        );


    if (settingsNav) {

        settingsNav.addEventListener(
            "click",
            event => {

                if (!isAdmin()) {

                    event.preventDefault();


                    alert(
                        "Only administrators can access Settings."
                    );
                }
            }
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    $("logoutButton")
        ?.addEventListener(
            "click",
            async () => {

                const token =
                    getAuthToken();


                try {

                    if (token) {

                        await fetch(
                            LOGOUT_URL,
                            {
                                method: "POST",

                                headers: {
                                    "Authorization":
                                        `Bearer ${token}`
                                }
                            }
                        );
                    }

                } catch (error) {

                    console.error(
                        "Logout request error:",
                        error
                    );
                }


                currentUser =
                    null;


                students =
                    [];


                currentModalStudent =
                    null;


                studentToDelete =
                    null;


                sessionStorage.removeItem(
                    "studentManagementUser"
                );


                showLoginPage();


                const username =
                    $("username");


                const password =
                    $("password");


                if (username)
                    username.value = "";


                if (password)
                    password.value = "";


                const message =
                    $("loginMessage");


                if (message)
                    message.textContent = "";
            }
        );
}


/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function setupPasswordToggle() {

    $("passwordToggle")
        ?.addEventListener(
            "click",
            () => {

                const password =
                    $("password");


                if (!password) return;


                if (
                    password.type ===
                    "password"
                ) {

                    password.type =
                        "text";

                } else {

                    password.type =
                        "password";
                }
            }
        );
}


/* =========================================================
   DATE
========================================================= */

function setCurrentDate() {

    const element =
        $("currentDate");


    if (!element) return;


    const now =
        new Date();


    element.textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    elementId,
    message,
    success = false
) {

    const element =
        $(elementId);


    if (!element) return;


    element.textContent =
        message;


    element.classList.remove(
        "success",
        "error"
    );


    element.classList.add(
        success
            ? "success"
            : "error"
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function closeSidebarOnMobile() {

    const sidebar =
        $("sidebar");


    if (!sidebar) return;


    if (
        window.innerWidth <= 900
    ) {

        sidebar.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.showSection =
    showSection;


window.renderStudents =
    renderStudents;


window.updateReports =
    updateReports;


window.loadStudents =
    loadStudents;


window.viewStudent =
    viewStudent;


window.editStudent =
    editStudent;


window.deleteStudent =
    deleteStudent;