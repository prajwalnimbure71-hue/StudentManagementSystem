import java.io.*;
import java.util.*;

public class Main {

    private static final String FILE_NAME = "students.txt";

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);

        while (true) {

            System.out.println();
            System.out.println("======================================");
            System.out.println("       STUDENT MANAGEMENT SYSTEM");
            System.out.println("======================================");
            System.out.println("1. Add Student");
            System.out.println("2. View Students");
            System.out.println("3. Search Student");
            System.out.println("4. Update Student");
            System.out.println("5. Delete Student");
            System.out.println("6. Exit");
            System.out.println("======================================");

            System.out.print("Enter your choice: ");

            int choice;

            try {
                choice = Integer.parseInt(scanner.nextLine());
            } catch (Exception e) {
                System.out.println("Please enter a valid number.");
                continue;
            }

            switch (choice) {

                case 1:
                    addStudent(scanner);
                    break;

                case 2:
                    viewStudents();
                    break;

                case 3:
                    searchStudent(scanner);
                    break;

                case 4:
                    updateStudent(scanner);
                    break;

                case 5:
                    deleteStudent(scanner);
                    break;

                case 6:
                    System.out.println("Program exited.");
                    scanner.close();
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }


    // =========================================================
    // ADD STUDENT
    // =========================================================

    private static void addStudent(Scanner scanner) {

        try {

            System.out.println();
            System.out.println("---------- ADD STUDENT ----------");

            System.out.print("Enter Student ID: ");
            int id = Integer.parseInt(scanner.nextLine());

            System.out.print("Enter Student Name: ");
            String name = scanner.nextLine();

            System.out.print("Enter Age: ");
            int age = Integer.parseInt(scanner.nextLine());

            System.out.print("Enter Branch: ");
            String branch = scanner.nextLine();

            System.out.print("Enter Marks: ");
            double marks = Double.parseDouble(scanner.nextLine());

            System.out.print("Enter Roll Number: ");
            int rollNo = Integer.parseInt(scanner.nextLine());

            Student student = new Student(
                    id,
                    name,
                    age,
                    branch,
                    marks,
                    rollNo
            );

            List<Student> students = loadStudents();

            // Check duplicate ID

            for (Student s : students) {

                if (s.getId() == id) {

                    System.out.println("Student ID already exists.");
                    return;
                }
            }

            students.add(student);

            saveStudents(students);

            System.out.println("Student added successfully.");

        } catch (Exception e) {

            System.out.println("Error while adding student.");
            System.out.println("Reason: " + e.getMessage());
        }
    }


    // =========================================================
    // VIEW STUDENTS
    // =========================================================

    private static void viewStudents() {

        List<Student> students = loadStudents();

        System.out.println();
        System.out.println("---------- STUDENT LIST ----------");

        if (students.isEmpty()) {

            System.out.println("No students found.");
            return;
        }

        for (Student student : students) {

            System.out.println("----------------------------------");

            System.out.println("ID       : " + student.getId());
            System.out.println("Name     : " + student.getName());
            System.out.println("Age      : " + student.getAge());
            System.out.println("Branch   : " + student.getBranch());
            System.out.println("Marks    : " + student.getMarks());
            System.out.println("Roll No  : " + student.getRollNo());
            System.out.println("Grade    : " + student.getGrade());
            System.out.println("Status   : " + student.getStatus());
        }

        System.out.println("----------------------------------");
    }


    // =========================================================
    // SEARCH STUDENT
    // =========================================================

    private static void searchStudent(Scanner scanner) {

        System.out.println();
        System.out.println("---------- SEARCH STUDENT ----------");

        System.out.print("Enter Student ID: ");

        try {

            int id = Integer.parseInt(scanner.nextLine());

            List<Student> students = loadStudents();

            for (Student student : students) {

                if (student.getId() == id) {

                    System.out.println();
                    System.out.println("Student Found!");
                    System.out.println("----------------------------------");
                    System.out.println("ID       : " + student.getId());
                    System.out.println("Name     : " + student.getName());
                    System.out.println("Age      : " + student.getAge());
                    System.out.println("Branch   : " + student.getBranch());
                    System.out.println("Marks    : " + student.getMarks());
                    System.out.println("Roll No  : " + student.getRollNo());
                    System.out.println("Grade    : " + student.getGrade());
                    System.out.println("Status   : " + student.getStatus());
                    System.out.println("----------------------------------");

                    return;
                }
            }

            System.out.println("Student not found.");

        } catch (Exception e) {

            System.out.println("Invalid Student ID.");
        }
    }


    // =========================================================
    // UPDATE STUDENT
    // =========================================================

    private static void updateStudent(Scanner scanner) {

        System.out.println();
        System.out.println("---------- UPDATE STUDENT ----------");

        try {

            System.out.print("Enter Student ID to update: ");

            int id = Integer.parseInt(scanner.nextLine());

            List<Student> students = loadStudents();

            Student foundStudent = null;

            for (Student student : students) {

                if (student.getId() == id) {

                    foundStudent = student;
                    break;
                }
            }

            if (foundStudent == null) {

                System.out.println("Student not found.");
                return;
            }

            System.out.println("Leave a field empty to keep the old value.");

            System.out.print("Name [" + foundStudent.getName() + "]: ");
            String name = scanner.nextLine();

            if (!name.isEmpty()) {
                foundStudent.setName(name);
            }

            System.out.print("Age [" + foundStudent.getAge() + "]: ");
            String ageInput = scanner.nextLine();

            if (!ageInput.isEmpty()) {
                foundStudent.setAge(Integer.parseInt(ageInput));
            }

            System.out.print("Branch [" + foundStudent.getBranch() + "]: ");
            String branch = scanner.nextLine();

            if (!branch.isEmpty()) {
                foundStudent.setBranch(branch);
            }

            System.out.print("Marks [" + foundStudent.getMarks() + "]: ");
            String marksInput = scanner.nextLine();

            if (!marksInput.isEmpty()) {
                foundStudent.setMarks(Double.parseDouble(marksInput));
            }

            System.out.print("Roll Number [" + foundStudent.getRollNo() + "]: ");
            String rollInput = scanner.nextLine();

            if (!rollInput.isEmpty()) {
                foundStudent.setRollNo(Integer.parseInt(rollInput));
            }

            saveStudents(students);

            System.out.println("Student updated successfully.");

        } catch (Exception e) {

            System.out.println("Error while updating student.");
            System.out.println("Reason: " + e.getMessage());
        }
    }


    // =========================================================
    // DELETE STUDENT
    // =========================================================

    private static void deleteStudent(Scanner scanner) {

        System.out.println();
        System.out.println("---------- DELETE STUDENT ----------");

        try {

            System.out.print("Enter Student ID to delete: ");

            int id = Integer.parseInt(scanner.nextLine());

            List<Student> students = loadStudents();

            boolean removed = false;

            Iterator<Student> iterator = students.iterator();

            while (iterator.hasNext()) {

                Student student = iterator.next();

                if (student.getId() == id) {

                    iterator.remove();
                    removed = true;
                    break;
                }
            }

            if (removed) {

                saveStudents(students);

                System.out.println("Student deleted successfully.");

            } else {

                System.out.println("Student not found.");
            }

        } catch (Exception e) {

            System.out.println("Error while deleting student.");
            System.out.println("Reason: " + e.getMessage());
        }
    }


    // =========================================================
    // LOAD STUDENTS
    // =========================================================

    private static List<Student> loadStudents() {

        List<Student> students = new ArrayList<>();

        File file = new File(FILE_NAME);

        if (!file.exists()) {

            return students;
        }

        try (BufferedReader reader =
                     new BufferedReader(new FileReader(file))) {

            String line;

            while ((line = reader.readLine()) != null) {

                line = line.trim();

                if (line.isEmpty()) {
                    continue;
                }

                try {

                    Student student = Student.fromCSV(line);

                    students.add(student);

                } catch (Exception e) {

                    System.out.println(
                            "Skipping invalid student record: " + line
                    );
                }
            }

        } catch (IOException e) {

            System.out.println(
                    "Error reading students.txt: " + e.getMessage()
            );
        }

        return students;
    }


    // =========================================================
    // SAVE STUDENTS
    // =========================================================

    private static void saveStudents(List<Student> students) {

        try (BufferedWriter writer =
                     new BufferedWriter(new FileWriter(FILE_NAME))) {

            for (Student student : students) {

                writer.write(student.toCSV());
                writer.newLine();
            }

        } catch (IOException e) {

            System.out.println(
                    "Error saving students.txt: " + e.getMessage()
            );
        }
    }
}