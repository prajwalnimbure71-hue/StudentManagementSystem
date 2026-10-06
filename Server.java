import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

public class Server {

    /* =========================================================
       CONFIGURATION
    ========================================================= */

    private static final int PORT = 8080;

private static final String WEBSITE_FOLDER =
        System.getProperty("user.dir");

    private static final String DATA_FILE =
            "C:\\Users\\Prajwal\\Desktop\\Java\\students.txt";


    /* =========================================================
       LOGIN CREDENTIALS
    ========================================================= */

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "admin123";

    private static final String USER_USERNAME = "user";
    private static final String USER_PASSWORD = "user123";


    /* =========================================================
       ACTIVE LOGIN SESSIONS
    ========================================================= */

    private static final Map<String, String> sessions =
            new ConcurrentHashMap<>();


    /* =========================================================
       MAIN
    ========================================================= */

    public static void main(String[] args) {

        try {

            ensureDataFile();

int port = Integer.parseInt(
        System.getenv().getOrDefault("PORT", String.valueOf(PORT))
);

HttpServer server =
        HttpServer.create(
                new InetSocketAddress("0.0.0.0", port),
                0
        );


            /* =================================================
               WEBSITE
            ================================================= */

            server.createContext(
                    "/",
                    Server::handleWebsite
            );


            /* =================================================
               LOGIN API
            ================================================= */

            server.createContext(
                    "/api/login",
                    Server::handleLogin
            );


            /* =================================================
               LOGOUT API
            ================================================= */

            server.createContext(
                    "/api/logout",
                    Server::handleLogout
            );


            /* =================================================
               STUDENT API
            ================================================= */

            server.createContext(
                    "/api/students",
                    Server::handleStudentsAPI
            );


            server.setExecutor(
                    Executors.newCachedThreadPool()
            );


            server.start();


            System.out.println();
            System.out.println("==============================================");
            System.out.println("   STUDENT MANAGEMENT SYSTEM");
            System.out.println("==============================================");
            System.out.println("Server started successfully.");
            System.out.println();
            System.out.println(
                    "Website: http://localhost:" + PORT
            );
            System.out.println();
            System.out.println("Admin Login:");
            System.out.println("Username: admin");
            System.out.println("Password: admin123");
            System.out.println();
            System.out.println("User Login:");
            System.out.println("Username: user");
            System.out.println("Password: user123");
            System.out.println();
            System.out.println("==============================================");
            System.out.println();

        } catch (Exception e) {

            System.err.println(
                    "Server failed to start."
            );

            e.printStackTrace();
        }
    }


    /* =========================================================
       ENSURE DATA FILE
    ========================================================= */

    private static void ensureDataFile()
            throws IOException {

        Path path =
                Paths.get(DATA_FILE);

        if (!Files.exists(path)) {

            Files.createFile(path);

            System.out.println(
                    "Created students.txt"
            );
        }
    }


    /* =========================================================
       WEBSITE HANDLER
    ========================================================= */

    private static void handleWebsite(
            HttpExchange exchange) {

        try {

            addCorsHeaders(exchange);


            String method =
                    exchange.getRequestMethod();


            if (!method.equalsIgnoreCase("GET")) {

                sendResponse(
                        exchange,
                        405,
                        "Method Not Allowed",
                        "text/plain"
                );

                return;
            }


            String requestPath =
                    exchange.getRequestURI()
                            .getPath();


            if (requestPath.equals("/")) {

                requestPath =
                        "/index.html";
            }


            String decodedPath =
                    URLDecoder.decode(
                            requestPath,
                            StandardCharsets.UTF_8
                    );


            /* Security check */

            if (
                    decodedPath.contains("..") ||
                    decodedPath.contains("\\")
            ) {

                sendResponse(
                        exchange,
                        403,
                        "Forbidden",
                        "text/plain"
                );

                return;
            }


            Path file =
                    Paths.get(
                            WEBSITE_FOLDER,
                            decodedPath.substring(1)
                    ).normalize();


            Path websiteRoot =
                    Paths.get(
                            WEBSITE_FOLDER
                    ).normalize();


            if (!file.startsWith(websiteRoot)) {

                sendResponse(
                        exchange,
                        403,
                        "Forbidden",
                        "text/plain"
                );

                return;
            }


            if (!Files.exists(file) ||
                    Files.isDirectory(file)) {

                sendResponse(
                        exchange,
                        404,
                        "File Not Found: " + decodedPath,
                        "text/plain"
                );

                return;
            }


            byte[] content =
                    Files.readAllBytes(file);


            Headers headers =
                    exchange.getResponseHeaders();


            headers.set(
                    "Content-Type",
                    getContentType(file)
            );


            headers.set(
                    "Cache-Control",
                    "no-cache, no-store, must-revalidate"
            );


            exchange.sendResponseHeaders(
                    200,
                    content.length
            );


            try (OutputStream output =
                         exchange.getResponseBody()) {

                output.write(content);
            }


        } catch (Exception e) {

            e.printStackTrace();

            sendResponse(
                    exchange,
                    500,
                    "Internal Server Error",
                    "text/plain"
            );
        }
    }


    /* =========================================================
       LOGIN API
    ========================================================= */

    private static void handleLogin(
            HttpExchange exchange) {

        try {

            addCorsHeaders(exchange);


            String method =
                    exchange.getRequestMethod();


            if (method.equalsIgnoreCase("OPTIONS")) {

                exchange.sendResponseHeaders(
                        204,
                        -1
                );

                exchange.close();

                return;
            }


            if (!method.equalsIgnoreCase("POST")) {

                sendJson(
                        exchange,
                        405,
                        "{\"success\":false,\"message\":\"Method Not Allowed\"}"
                );

                return;
            }


            String requestBody =
                    readRequestBody(exchange);


            String username =
                    extractJsonString(
                            requestBody,
                            "username"
                    );


            String password =
                    extractJsonString(
                            requestBody,
                            "password"
                    );


            if (
                    username == null ||
                    password == null
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Username and password are required.\"}"
                );

                return;
            }


            String role = null;


            /* =================================================
               ADMIN LOGIN
            ================================================= */

            if (
                    ADMIN_USERNAME.equals(username) &&
                    ADMIN_PASSWORD.equals(password)
            ) {

                role = "admin";
            }


            /* =================================================
               USER LOGIN
            ================================================= */

            else if (
                    USER_USERNAME.equals(username) &&
                    USER_PASSWORD.equals(password)
            ) {

                role = "user";
            }


            /* =================================================
               INVALID LOGIN
            ================================================= */

            else {

                sendJson(
                        exchange,
                        401,
                        "{\"success\":false,\"message\":\"Invalid username or password.\"}"
                );

                return;
            }


            /* =================================================
               CREATE SESSION TOKEN
            ================================================= */

            String token =
                    UUID.randomUUID()
                            .toString();


            sessions.put(
                    token,
                    username
            );


            String response =
                    "{"
                    + "\"success\":true,"
                    + "\"message\":\"Login successful\","
                    + "\"token\":\""
                    + escapeJson(token)
                    + "\","
                    + "\"username\":\""
                    + escapeJson(username)
                    + "\","
                    + "\"role\":\""
                    + escapeJson(role)
                    + "\""
                    + "}";


            sendJson(
                    exchange,
                    200,
                    response
            );


        } catch (Exception e) {

            e.printStackTrace();

            sendJson(
                    exchange,
                    500,
                    "{\"success\":false,\"message\":\"Login server error.\"}"
            );
        }
    }


    /* =========================================================
       LOGOUT API
    ========================================================= */

    private static void handleLogout(
            HttpExchange exchange) {

        try {

            addCorsHeaders(exchange);


            String method =
                    exchange.getRequestMethod();


            if (method.equalsIgnoreCase("OPTIONS")) {

                exchange.sendResponseHeaders(
                        204,
                        -1
                );

                exchange.close();

                return;
            }


            if (!method.equalsIgnoreCase("POST")) {

                sendJson(
                        exchange,
                        405,
                        "{\"success\":false,\"message\":\"Method Not Allowed\"}"
                );

                return;
            }


            String token =
                    getToken(exchange);


            if (token != null) {

                sessions.remove(token);
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,\"message\":\"Logged out successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();

            sendJson(
                    exchange,
                    500,
                    "{\"success\":false,\"message\":\"Logout error.\"}"
            );
        }
    }


    /* =========================================================
       STUDENT API
    ========================================================= */

    private static void handleStudentsAPI(
            HttpExchange exchange) {

        try {

            addCorsHeaders(exchange);


            String method =
                    exchange.getRequestMethod();


            /* =================================================
               CORS PREFLIGHT
            ================================================= */

            if (method.equalsIgnoreCase("OPTIONS")) {

                exchange.sendResponseHeaders(
                        204,
                        -1
                );

                exchange.close();

                return;
            }


            /* =================================================
               GET - ADMIN + USER
            ================================================= */

            if (method.equalsIgnoreCase("GET")) {

                if (!isAuthenticated(exchange)) {

                    sendJson(
                            exchange,
                            401,
                            "{\"success\":false,\"message\":\"Authentication required.\"}"
                    );

                    return;
                }


                handleGetStudents(exchange);

                return;
            }


            /* =================================================
               POST - ADMIN ONLY
            ================================================= */

            if (method.equalsIgnoreCase("POST")) {

                if (!isAdmin(exchange)) {

                    if (!isAuthenticated(exchange)) {

                        sendJson(
                                exchange,
                                401,
                                "{\"success\":false,\"message\":\"Authentication required.\"}"
                        );

                    } else {

                        sendJson(
                                exchange,
                                403,
                                "{\"success\":false,\"message\":\"Admin access required.\"}"
                        );
                    }

                    return;
                }


                handleAddStudent(exchange);

                return;
            }


            /* =================================================
               PUT - ADMIN ONLY
            ================================================= */

            if (method.equalsIgnoreCase("PUT")) {

                if (!isAdmin(exchange)) {

                    if (!isAuthenticated(exchange)) {

                        sendJson(
                                exchange,
                                401,
                                "{\"success\":false,\"message\":\"Authentication required.\"}"
                        );

                    } else {

                        sendJson(
                                exchange,
                                403,
                                "{\"success\":false,\"message\":\"Admin access required.\"}"
                        );
                    }

                    return;
                }


                handleUpdateStudent(exchange);

                return;
            }


            /* =================================================
               DELETE - ADMIN ONLY
            ================================================= */

            if (method.equalsIgnoreCase("DELETE")) {

                if (!isAdmin(exchange)) {

                    if (!isAuthenticated(exchange)) {

                        sendJson(
                                exchange,
                                401,
                                "{\"success\":false,\"message\":\"Authentication required.\"}"
                        );

                    } else {

                        sendJson(
                                exchange,
                                403,
                                "{\"success\":false,\"message\":\"Admin access required.\"}"
                        );
                    }

                    return;
                }


                handleDeleteStudent(exchange);

                return;
            }


            sendJson(
                    exchange,
                    405,
                    "{\"success\":false,\"message\":\"Method Not Allowed\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();

            sendJson(
                    exchange,
                    500,
                    "{\"success\":false,\"message\":\"Internal server error.\"}"
            );
        }
    }


    /* =========================================================
       GET STUDENTS
    ========================================================= */

    private static void handleGetStudents(
            HttpExchange exchange)
            throws IOException {

        List<Student> students =
                readStudents();


        String json =
                studentsToJson(students);


        sendJson(
                exchange,
                200,
                json
        );
    }


    /* =========================================================
       ADD STUDENT
    ========================================================= */

    private static void handleAddStudent(
            HttpExchange exchange)
            throws IOException {

        String body =
                readRequestBody(exchange);


        try {

            Student student =
                    studentFromJson(body);


            if (student.getId() <= 0) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Student ID must be greater than 0.\"}"
                );

                return;
            }


            if (
                    student.getName() == null ||
                    student.getName().trim().isEmpty()
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Student name is required.\"}"
                );

                return;
            }


            if (
                    student.getAge() <= 0 ||
                    student.getAge() > 100
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Age must be between 1 and 100.\"}"
                );

                return;
            }


            if (
                    student.getMarks() < 0 ||
                    student.getMarks() > 100
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Marks must be between 0 and 100.\"}"
                );

                return;
            }


            if (student.getRollNo() <= 0) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Roll number must be greater than 0.\"}"
                );

                return;
            }


            List<Student> students =
                    readStudents();


            /* Check duplicate ID */

            for (Student existing : students) {

                if (
                        existing.getId() ==
                        student.getId()
                ) {

                    sendJson(
                            exchange,
                            409,
                            "{\"success\":false,\"message\":\"Student ID already exists.\"}"
                    );

                    return;
                }
            }


            /* Check duplicate roll number */

            for (Student existing : students) {

                if (
                        existing.getRollNo() ==
                        student.getRollNo()
                ) {

                    sendJson(
                            exchange,
                            409,
                            "{\"success\":false,\"message\":\"Roll number already exists.\"}"
                    );

                    return;
                }
            }


            students.add(student);


            writeStudents(students);


            sendJson(
                    exchange,
                    201,
                    "{"
                    + "\"success\":true,"
                    + "\"message\":\"Student added successfully\","
                    + "\"student\":"
                    + studentToJson(student)
                    + "}"
            );


        } catch (Exception e) {

            sendJson(
                    exchange,
                    400,
                    "{"
                    + "\"success\":false,"
                    + "\"message\":\"Invalid student data: "
                    + escapeJson(e.getMessage())
                    + "\""
                    + "}"
            );
        }
    }


    /* =========================================================
       UPDATE STUDENT
    ========================================================= */

    private static void handleUpdateStudent(
            HttpExchange exchange)
            throws IOException {

        String body =
                readRequestBody(exchange);


        try {

            Map<String, String> query =
                    parseQuery(
                            exchange.getRequestURI()
                                    .getRawQuery()
                    );


            int id;


            if (query.containsKey("id")) {

                id =
                        Integer.parseInt(
                                query.get("id")
                        );

            } else {

                Student temp =
                        studentFromJson(body);

                id =
                        temp.getId();
            }


            Student updated =
                    studentFromJson(body);


            updated.setId(id);


            if (id <= 0) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Invalid student ID.\"}"
                );

                return;
            }


            if (
                    updated.getName() == null ||
                    updated.getName().trim().isEmpty()
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Student name is required.\"}"
                );

                return;
            }


            if (
                    updated.getAge() <= 0 ||
                    updated.getAge() > 100
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Age must be between 1 and 100.\"}"
                );

                return;
            }


            if (
                    updated.getMarks() < 0 ||
                    updated.getMarks() > 100
            ) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Marks must be between 0 and 100.\"}"
                );

                return;
            }


            if (updated.getRollNo() <= 0) {

                sendJson(
                        exchange,
                        400,
                        "{\"success\":false,\"message\":\"Roll number must be greater than 0.\"}"
                );

                return;
            }


            List<Student> students =
                    readStudents();


            boolean found =
                    false;


            for (int i = 0;
                 i < students.size();
                 i++) {

                Student existing =
                        students.get(i);


                if (
                        existing.getId() ==
                        id
                ) {

                    /* Prevent duplicate roll number */

                    for (Student other : students) {

                        if (
                                other.getId() != id &&
                                other.getRollNo() ==
                                updated.getRollNo()
                        ) {

                            sendJson(
                                    exchange,
                                    409,
                                    "{\"success\":false,\"message\":\"Roll number already exists.\"}"
                            );

                            return;
                        }
                    }


                    students.set(
                            i,
                            updated
                    );


                    found =
                            true;

                    break;
                }
            }


            if (!found) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,\"message\":\"Student not found.\"}"
                );

                return;
            }


            writeStudents(students);


            sendJson(
                    exchange,
                    200,
                    "{"
                    + "\"success\":true,"
                    + "\"message\":\"Student updated successfully\","
                    + "\"student\":"
                    + studentToJson(updated)
                    + "}"
            );


        } catch (Exception e) {

            sendJson(
                    exchange,
                    400,
                    "{"
                    + "\"success\":false,"
                    + "\"message\":\"Invalid student data: "
                    + escapeJson(e.getMessage())
                    + "\""
                    + "}"
            );
        }
    }


    /* =========================================================
       DELETE STUDENT
    ========================================================= */

    private static void handleDeleteStudent(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(
                        exchange.getRequestURI()
                                .getRawQuery()
                );


        if (!query.containsKey("id")) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,\"message\":\"Student ID is required.\"}"
            );

            return;
        }


        try {

            int id =
                    Integer.parseInt(
                            query.get("id")
                    );


            List<Student> students =
                    readStudents();


            boolean removed =
                    students.removeIf(
                            student ->
                                    student.getId() ==
                                    id
                    );


            if (!removed) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,\"message\":\"Student not found.\"}"
                );

                return;
            }


            writeStudents(students);


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,\"message\":\"Student deleted successfully.\"}"
            );


        } catch (NumberFormatException e) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,\"message\":\"Invalid student ID.\"}"
            );
        }
    }


    /* =========================================================
       READ STUDENTS FROM FILE
    ========================================================= */

    private static List<Student> readStudents()
            throws IOException {

        List<Student> students =
                new ArrayList<>();


        Path path =
                Paths.get(DATA_FILE);


        if (!Files.exists(path)) {

            return students;
        }


        List<String> lines =
                Files.readAllLines(
                        path,
                        StandardCharsets.UTF_8
                );


        for (String line : lines) {

            line =
                    line.trim();


            if (line.isEmpty()) {

                continue;
            }


            try {

                students.add(
                        Student.fromCSV(line)
                );

            } catch (Exception e) {

                System.err.println(
                        "Skipping invalid record: "
                        + line
                );
            }
        }


        return students;
    }


    /* =========================================================
       WRITE STUDENTS TO FILE
    ========================================================= */

    private static void writeStudents(
            List<Student> students)
            throws IOException {

        Path path =
                Paths.get(DATA_FILE);


        List<String> lines =
                new ArrayList<>();


        for (Student student : students) {

            lines.add(
                    student.toCSV()
            );
        }


        Files.write(
                path,
                lines,
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING
        );
    }


    /* =========================================================
       AUTHENTICATION
    ========================================================= */

    private static boolean isAuthenticated(
            HttpExchange exchange) {

        String token =
                getToken(exchange);


        if (token == null) {

            return false;
        }


        return sessions.containsKey(token);
    }


    /* =========================================================
       ADMIN CHECK
    ========================================================= */

    private static boolean isAdmin(
            HttpExchange exchange) {

        String token =
                getToken(exchange);


        if (token == null) {

            return false;
        }


        String username =
                sessions.get(token);


        return ADMIN_USERNAME.equals(
                username
        );
    }


    /* =========================================================
       GET BEARER TOKEN
    ========================================================= */

    private static String getToken(
            HttpExchange exchange) {

        String authorization =
                exchange.getRequestHeaders()
                        .getFirst(
                                "Authorization"
                        );


        if (authorization == null) {

            return null;
        }


        authorization =
                authorization.trim();


        if (
                !authorization.startsWith(
                        "Bearer "
                )
        ) {

            return null;
        }


        return authorization
                .substring(7)
                .trim();
    }


    /* =========================================================
       READ REQUEST BODY
    ========================================================= */

    private static String readRequestBody(
            HttpExchange exchange)
            throws IOException {

        try (InputStream input =
                     exchange.getRequestBody()) {

            return new String(
                    input.readAllBytes(),
                    StandardCharsets.UTF_8
            );
        }
    }


    /* =========================================================
       STUDENT JSON PARSER
    ========================================================= */

    private static Student studentFromJson(
            String json) {

        int id =
                parseJsonInt(
                        json,
                        "id"
                );


        String name =
                extractJsonString(
                        json,
                        "name"
                );


        int age =
                parseJsonInt(
                        json,
                        "age"
                );


        String branch =
                extractJsonString(
                        json,
                        "branch"
                );


        double marks =
                parseJsonDouble(
                        json,
                        "marks"
                );


        int rollNo =
                parseJsonInt(
                        json,
                        "rollNo"
                );


        return new Student(
                id,
                name == null ? "" : name,
                age,
                branch == null ? "" : branch,
                marks,
                rollNo
        );
    }


    /* =========================================================
       PARSE JSON STRING
    ========================================================= */

    private static String extractJsonString(
            String json,
            String key) {

        if (json == null) {

            return null;
        }


        String pattern =
                "\"" + key + "\"";


        int keyIndex =
                json.indexOf(pattern);


        if (keyIndex < 0) {

            return null;
        }


        int colon =
                json.indexOf(
                        ":",
                        keyIndex
                );


        if (colon < 0) {

            return null;
        }


        int start =
                json.indexOf(
                        "\"",
                        colon + 1
                );


        if (start < 0) {

            return null;
        }


        int end =
                start + 1;


        while (end < json.length()) {

            if (
                    json.charAt(end) == '"' &&
                    json.charAt(end - 1) != '\\'
            ) {

                break;
            }


            end++;
        }


        if (end >= json.length()) {

            return null;
        }


        return json.substring(
                start + 1,
                end
        )
                .replace(
                        "\\\"",
                        "\""
                )
                .replace(
                        "\\\\",
                        "\\"
                );
    }


    /* =========================================================
       PARSE JSON INT
    ========================================================= */

    private static int parseJsonInt(
            String json,
            String key) {

        String value =
                extractJsonValue(
                        json,
                        key
                );


        if (
                value == null ||
                value.isEmpty()
        ) {

            return 0;
        }


        return Integer.parseInt(
                value
        );
    }


    /* =========================================================
       PARSE JSON DOUBLE
    ========================================================= */

    private static double parseJsonDouble(
            String json,
            String key) {

        String value =
                extractJsonValue(
                        json,
                        key
                );


        if (
                value == null ||
                value.isEmpty()
        ) {

            return 0;
        }


        return Double.parseDouble(
                value
        );
    }


    /* =========================================================
       EXTRACT JSON NUMBER / VALUE
    ========================================================= */

    private static String extractJsonValue(
            String json,
            String key) {

        if (json == null) {

            return null;
        }


        String pattern =
                "\"" + key + "\"";


        int keyIndex =
                json.indexOf(pattern);


        if (keyIndex < 0) {

            return null;
        }


        int colon =
                json.indexOf(
                        ":",
                        keyIndex
                );


        if (colon < 0) {

            return null;
        }


        int start =
                colon + 1;


        while (
                start < json.length() &&
                Character.isWhitespace(
                        json.charAt(start)
                )
        ) {

            start++;
        }


        int end =
                start;


        while (
                end < json.length() &&
                ",}".indexOf(
                        json.charAt(end)
                ) == -1
        ) {

            end++;
        }


        return json.substring(
                start,
                end
        )
                .trim()
                .replace(
                        "\"",
                        ""
                );
    }


    /* =========================================================
       STUDENT TO JSON
    ========================================================= */

    private static String studentToJson(
            Student student) {

        return "{"
                + "\"id\":"
                + student.getId()
                + ","
                + "\"name\":\""
                + escapeJson(
                        student.getName()
                )
                + "\","
                + "\"age\":"
                + student.getAge()
                + ","
                + "\"branch\":\""
                + escapeJson(
                        student.getBranch()
                )
                + "\","
                + "\"marks\":"
                + student.getMarks()
                + ","
                + "\"rollNo\":"
                + student.getRollNo()
                + ","
                + "\"grade\":\""
                + escapeJson(
                        student.getGrade()
                )
                + "\","
                + "\"status\":\""
                + escapeJson(
                        student.getStatus()
                )
                + "\""
                + "}";
    }


    /* =========================================================
       STUDENTS TO JSON
    ========================================================= */

    private static String studentsToJson(
            List<Student> students) {

        StringBuilder json =
                new StringBuilder();


        json.append("[");


        for (int i = 0;
             i < students.size();
             i++) {

            if (i > 0) {

                json.append(",");
            }


            json.append(
                    studentToJson(
                            students.get(i)
                    )
            );
        }


        json.append("]");


        return json.toString();
    }


    /* =========================================================
       QUERY STRING PARSER
    ========================================================= */

    private static Map<String, String> parseQuery(
            String query) {

        Map<String, String> result =
                new HashMap<>();


        if (
                query == null ||
                query.isEmpty()
        ) {

            return result;
        }


        String[] pairs =
                query.split("&");


        for (String pair : pairs) {

            String[] parts =
                    pair.split(
                            "=",
                            2
                    );


            if (parts.length == 2) {

                try {

                    result.put(
                            URLDecoder.decode(
                                    parts[0],
                                    StandardCharsets.UTF_8
                            ),

                            URLDecoder.decode(
                                    parts[1],
                                    StandardCharsets.UTF_8
                            )
                    );

                } catch (Exception e) {

                    // Ignore invalid query value
                }
            }
        }


        return result;
    }


    /* =========================================================
       JSON RESPONSE
    ========================================================= */

    private static void sendJson(
            HttpExchange exchange,
            int status,
            String json) {

        sendResponse(
                exchange,
                status,
                json,
                "application/json; charset=UTF-8"
        );
    }


    /* =========================================================
       GENERAL RESPONSE
    ========================================================= */

    private static void sendResponse(
            HttpExchange exchange,
            int status,
            String response,
            String contentType) {

        try {

            byte[] bytes =
                    response.getBytes(
                            StandardCharsets.UTF_8
                    );


            exchange.getResponseHeaders()
                    .set(
                            "Content-Type",
                            contentType
                    );


            exchange.getResponseHeaders()
                    .set(
                            "Cache-Control",
                            "no-cache, no-store, must-revalidate"
                    );


            exchange.sendResponseHeaders(
                    status,
                    bytes.length
            );


            try (OutputStream output =
                         exchange.getResponseBody()) {

                output.write(bytes);
            }


        } catch (IOException e) {

            e.printStackTrace();
        }
    }


    /* =========================================================
       CORS HEADERS
    ========================================================= */

    private static void addCorsHeaders(
            HttpExchange exchange) {

        Headers headers =
                exchange.getResponseHeaders();


        headers.set(
                "Access-Control-Allow-Origin",
                "*"
        );


        headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
        );


        headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
        );


        headers.set(
                "Access-Control-Max-Age",
                "3600"
        );
    }


    /* =========================================================
       CONTENT TYPE
    ========================================================= */

    private static String getContentType(
            Path file) {

        String name =
                file.getFileName()
                        .toString()
                        .toLowerCase();


        if (name.endsWith(".html")) {

            return "text/html; charset=UTF-8";
        }


        if (name.endsWith(".css")) {

            return "text/css; charset=UTF-8";
        }


        if (name.endsWith(".js")) {

            return "application/javascript; charset=UTF-8";
        }


        if (name.endsWith(".json")) {

            return "application/json; charset=UTF-8";
        }


        if (name.endsWith(".png")) {

            return "image/png";
        }


        if (
                name.endsWith(".jpg") ||
                name.endsWith(".jpeg")
        ) {

            return "image/jpeg";
        }


        if (name.endsWith(".gif")) {

            return "image/gif";
        }


        if (name.endsWith(".svg")) {

            return "image/svg+xml";
        }


        if (name.endsWith(".ico")) {

            return "image/x-icon";
        }


        if (name.endsWith(".txt")) {

            return "text/plain; charset=UTF-8";
        }


        return "application/octet-stream";
    }


    /* =========================================================
       JSON ESCAPE
    ========================================================= */

    private static String escapeJson(
            String value) {

        if (value == null) {

            return "";
        }


        return value
                .replace(
                        "\\",
                        "\\\\"
                )
                .replace(
                        "\"",
                        "\\\""
                )
                .replace(
                        "\r",
                        "\\r"
                )
                .replace(
                        "\n",
                        "\\n"
                )
                .replace(
                        "\t",
                        "\\t"
                );
    }
}