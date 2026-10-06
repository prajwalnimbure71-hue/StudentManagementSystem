public class Student {

    private int id;
    private String name;
    private int age;
    private String branch;
    private double marks;
    private int rollNo;

    public Student(int id, String name, int age, String branch, double marks, int rollNo) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.branch = branch;
        this.marks = marks;
        this.rollNo = rollNo;
    }

    // GETTERS

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }

    public String getBranch() {
        return branch;
    }

    public double getMarks() {
        return marks;
    }

    public int getRollNo() {
        return rollNo;
    }

    // SETTERS

    public void setId(int id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public void setMarks(double marks) {
        this.marks = marks;
    }

    public void setRollNo(int rollNo) {
        this.rollNo = rollNo;
    }

    // GRADE

    public String getGrade() {

        if (marks >= 90) {
            return "A+";
        } else if (marks >= 80) {
            return "A";
        } else if (marks >= 70) {
            return "B+";
        } else if (marks >= 60) {
            return "B";
        } else if (marks >= 50) {
            return "C";
        } else if (marks >= 40) {
            return "D";
        } else {
            return "F";
        }
    }

    // PASS / FAIL

    public String getStatus() {

        if (marks >= 40) {
            return "PASS";
        } else {
            return "FAIL";
        }
    }

    // CSV FORMAT

    public String toCSV() {

        return id + "," +
               name + "," +
               age + "," +
               branch + "," +
               marks + "," +
               rollNo;
    }

    // CREATE STUDENT FROM CSV

    public static Student fromCSV(String line) {

        String[] data = line.split(",");

        if (data.length != 6) {
            throw new IllegalArgumentException("Invalid student data: " + line);
        }

        int id = Integer.parseInt(data[0].trim());
        String name = data[1].trim();
        int age = Integer.parseInt(data[2].trim());
        String branch = data[3].trim();
        double marks = Double.parseDouble(data[4].trim());
        int rollNo = Integer.parseInt(data[5].trim());

        return new Student(
                id,
                name,
                age,
                branch,
                marks,
                rollNo
        );
    }

    @Override
    public String toString() {

        return "Student{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", age=" + age +
                ", branch='" + branch + '\'' +
                ", marks=" + marks +
                ", rollNo=" + rollNo +
                '}';
    }
}