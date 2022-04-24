import {
  assignResponsible,
  createTask,
  createUser,
  deleteTask,
  deleteUser,
  editStatus,
  editUser,
  getDelayedTasks,
  getResponsibles,
  getTaskByCreatorId,
  getTaskById,
  getTasksByStatus,
  getUserById,
  getUsers,
  removeResponsible,
  searchTask,
  searchUser,
} from "./tools/functions";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import { AddressInfo } from "net";
import connection from "./connection";

const app: Express = express();
app.use(express.json());
app.use(cors());

//Creates a new user
app.post("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await connection("Users").select();
    const name: string = req.body.name;
    const nick: string = req.body.nick;
    const email: string = req.body.email;

    if (!name || !nick || !email) {
      throw new Error("Please fill in all fields.");
    }

    for (let i = 0; i < users.length; i++) {
      if (users[i].user_nick === nick || users[i].user_email === email) {
        throw new Error("Nickname or email already registered.");
      }
    }

    await createUser(name, nick, email);
    res.status(201).send("User created!");
  } catch (error: any) {
    switch (error.message) {
      case "Please fill in all fields.":
        res.status(412).send(error.message);
        break;
      case "Nickname or email already registered.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Creates a new task
app.post("/tasks", async (req: Request, res: Response): Promise<void> => {
  try {
    const title = req.body.title;
    const description = req.body.description;
    const deadline = req.body.deadline;
    const creator = req.body.creator;

    if (!title || !description || !deadline || !creator) {
      throw new Error("Please fill in all fields.");
    }

    await createTask(title, description, deadline, creator);

    res.status(201).send("Task successfully created!");
  } catch (error: any) {
    switch (error.message) {
      case "Please fill in all fields.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Assigns a responsible
app.post(
  "/tasks/responsible",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const taskId = req.body.task_id;
      const userId = req.body.user_id;

      if (!taskId || !userId || userId.length === 0) {
        throw new Error("Please fill in all fields.");
      }

      await assignResponsible(taskId, userId);

      res.status(201).send("User assigned.");
    } catch (error: any) {
      switch (error.message) {
        case "Please fill in all fields.":
          res.status(412).send(error.message);
          break;
        default:
          res
            .status(500)
            .send("Something bad happened. Please contact support.");
      }
    }
  }
);

//Gets all users
app.get("/users/all", async (req: Request, res: Response): Promise<any> => {
  try {
    const response = await getUsers();
    res.status(200).send(response);
  } catch (error: any) {
    res.status(500).send("Something bad happened. Please contact support.");
  }
});

//Searches for an user
app.get("/users", async (req: Request, res: Response): Promise<any> => {
  try {
    const query = req.query.query as string;

    if (!query) {
      throw new Error("Please give a search value.");
    }

    const result = await searchUser(query);

    if (result.length === 0) {
      res.status(200).send({ users: [] });
    }

    res.status(200).send({ users: result });
  } catch (error: any) {
    switch (error.message) {
      case "Please give a search value.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Gets user by id
app.get("/users/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await connection("Users").select();
    const id: string = req.params.id;

    const idList = users.map((user) => {
      return user.user_id;
    });

    if (!idList.includes(id)) {
      throw new Error("User not found.");
    }

    const result = await getUserById(id);
    res.status(200).send(result);
  } catch (error: any) {
    switch (error.message) {
      case "User not found.":
        res.status(404).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Gets tasks by creator id
app.get("/tasks", async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.query.task_creator;

    if (!id) {
      throw new Error("Please give an Id.");
    }

    const result = await getTaskByCreatorId(id);

    const formattedResult = result.tasks.map((item: any) => {
      return {
        ...item,
        task_deadline: item.task_deadline
          .toLocaleString("pt-BR")
          .split(" ")
          .splice(0, 1)
          .join(),
      };
    });

    res.status(200).send({ tasks: formattedResult });
  } catch (error: any) {
    switch (error.message) {
      case "Please give an Id.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Searches for a task
app.get("/tasks/search", async (req: Request, res: Response): Promise<any> => {
  try {
    const query = req.query.query as string;

    if (!query) {
      throw new Error("Please give a search value.");
    }

    const result = await searchTask(query);

    if (result.length === 0) {
      res.status(200).send({ tasks: [] });
    }

    const formattedResult = result.map((item: any) => {
      return {
        ...item,
        task_deadline: item.task_deadline
          .toLocaleString("pt-BR")
          .split(" ")
          .splice(0, 1)
          .join(),
      };
    });

    res.status(200).send({ tasks: formattedResult });
  } catch (error: any) {
    console.log(error);
    switch (error.message) {
      case "Please give a search value.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Gets tasks by status
app.get("/tasks/status", async (req: Request, res: Response): Promise<any> => {
  try {
    const status = req.query.status as string;
    if (!status) {
      throw new Error(
        "Please inser a valid status ('to-do', 'doing', or 'done')."
      );
    }

    const result = await getTasksByStatus(status);

    const formattedResult = result.map((item: any) => {
      return {
        ...item,
        task_deadline: item.task_deadline
          .toLocaleString("pt-BR")
          .split(" ")
          .splice(0, 1)
          .join(),
      };
    });

    res.status(200).send({ tasks: formattedResult });
  } catch (error: any) {
    console.log(error.message);
    switch (error.message) {
      case "Please inser a valid status ('to do', 'doing', or 'done').":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Gets overdue tasks
app.get("/tasks/overdue", async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await getDelayedTasks();

    const formattedResult = result.map((item: any) => {
      return {
        ...item,
        task_deadline: item.task_deadline
          .toLocaleString("pt-BR")
          .split(" ")
          .splice(0, 1)
          .join(),
      };
    });

    res.status(200).send({ tasks: formattedResult });
  } catch (error) {
    console.log(error);
  }
});

//Gets task by id
app.get("/tasks/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const tasks = await connection("Tasks").select();
    const id: string = req.params.id;

    const idList = tasks.map((task) => {
      return task.task_id;
    });

    if (!idList.includes(id)) {
      throw new Error("Task not found.");
    }

    const result = await getTaskById(id);

    const formattedDeadline = result.task_deadline
      .toLocaleString("pt-BR")
      .split(" ")
      .splice(0, 1)
      .join();
    res.status(200).send({ ...result, task_deadline: formattedDeadline });
  } catch (error: any) {
    switch (error.message) {
      case "Task not found.":
        res.status(404).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Gets responsibles for an specific task by task's id
app.get(
  "/tasks/:id/responsible",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const tasks = await connection("Tasks").select();
      const id: string = req.params.id;

      const idList = tasks.map((task) => {
        return task.task_id;
      });

      if (!id) {
        throw new Error("Please give an Id.");
      }

      if (!idList.includes(id)) {
        throw new Error("Task not found.");
      }

      const result = await getResponsibles(id);

      res.status(200).send(result);
    } catch (error: any) {
      switch (error.message) {
        case "Please give an Id":
          res.status(412).send(error.message);
          break;
        case "Task not found.":
          res.status(404).send(error.message);
          break;
        default:
          res
            .status(500)
            .send("Something bad happened. Please contact support.");
      }
    }
  }
);

//Edits user
app.patch(
  "/users/edit/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const users = await connection("Users").select();
      const id: string = req.params.id;
      const name: string = req.body.name;
      const nick: string = req.body.nick;

      if (!id) {
        throw new Error("Please insert an Id.");
      }

      if (!name || !nick) {
        throw new Error("Please fill in all fields.");
      }

      for (let i = 0; i < users.length; i++) {
        if (users[i].user_nick === nick) {
          throw new Error("Nickname already registered.");
        }
      }

      const idList = users.map((user) => {
        return user.user_id;
      });

      if (!idList.includes(id)) {
        throw new Error("User not found.");
      }

      await editUser(id, name, nick);
      res.status(200).send("User successfully updated!");
    } catch (error: any) {
      switch (error.message) {
        case "Please insert an Id.":
          res.status(412).send(error.message);
          break;
        case "Please fill in all fields.":
          res.status(412).send(error.message);
          break;
        case "Nickname already registered.":
          res.status(412).send(error.message);
          break;
        case "User not found.":
          res.status(412).send(error.message);
          break;
        default:
          res
            .status(500)
            .send("Something bad happened. Please contact support.");
      }
    }
  }
);

//Edits status
app.patch(
  "/tasks/status/edit",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tasks = await connection("Tasks").select("task_id");
      const id = req.body.id;
      const status = req.body.status;

      if (id.length === 0) {
        throw new Error("Please give an Id.");
      }

      const taskIds = tasks.map((item) => {
        return item.task_id;
      });
      id.forEach((item: any) => {
        if (!taskIds.includes(item)) {
          throw new Error("Task not found.");
        }
      });

      if (!status) {
        throw new Error(
          "Please give a valid status('to-do', 'doing' or 'done')."
        );
      }

      await editStatus(id, status);

      res.status(200).send("Status successfully updated!");
    } catch (error: any) {
      console.log;
      switch (error.message) {
        case "Please give an Id.":
          res.status(412).send(error.message);
          break;
        case "Task not found.":
          res.status(404).send(error.message);
          break;
        case "Please give a valid status('to do', 'doing' or 'done').":
          res.status(412).send(error.message);
          break;
        default:
          res
            .status(500)
            .send("Something bad happened. Please contact support.");
      }
    }
  }
);

//Delete task
app.delete("/tasks/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    if (!id) {
      throw new Error("Please give an Id.");
    }

    await deleteTask(id);
    res.status(200).send("Task deleted.");
  } catch (error: any) {
    switch (error.message) {
      case "Please give an Id.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

//Remove responsible
app.delete(
  "/tasks/:taskId/responsible/:userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const taskId = req.params.taskId;
      const userId = req.params.userId;
      const taskUserPair = await connection("UserAndTask")
        .select()
        .where("task_id", taskId);

      if (!taskId || !userId) {
        throw new Error("Task or user id missing.");
      }

      const taskIdList = taskUserPair.map((item) => {
        return item.task_id;
      });
      const userIdList = taskUserPair.map((item) => {
        return item.user_id;
      });

      if (!taskIdList.includes(taskId)) {
        throw new Error("Task not found.");
      }

      if (!userIdList.includes(userId)) {
        console.log(taskUserPair, userId);
        throw new Error("This user isn't responsible for this task.");
      }

      await removeResponsible(taskId, userId);

      res.status(200).send("Responsible removed.");
    } catch (error: any) {
      switch (error.message) {
        case "Task or user id missing.":
          res.status(412).send(error.message);
          break;
        case "User or task not found.":
          res.status(404).send(error.message);
          break;
        case "This user isn't responsible for this task.":
          res.status(412).send(error.message);
          break;
        default:
          res
            .status(500)
            .send("Something bad happened. Please contact support.");
      }
    }
  }
);

//Delete user
app.delete("/users/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new Error("Please give an Id.");
    }

    await deleteUser(id);

    res.status(200).send("User deleted.");
  } catch (error: any) {
    console.log(error.message);
    switch (error.message) {
      case "Please give an Id.":
        res.status(412).send(error.message);
        break;
      default:
        res.status(500).send("Something bad happened. Please contact support.");
    }
  }
});

const server = app.listen(process.env.PORT || 3003, () => {
  if (server) {
    const address = server.address() as AddressInfo;
    console.log(`Server is running in http://localhost:${address.port}`);
  } else {
    console.error(`Failure upon starting server.`);
  }
});
