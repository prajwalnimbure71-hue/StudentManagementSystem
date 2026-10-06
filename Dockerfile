FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN javac Student.java Main.java Server.java

EXPOSE 8080

CMD ["java", "Server"]