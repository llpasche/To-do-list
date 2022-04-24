import connection from "../connection";

//Creates a new user
export const createUser = async (
  name: string,
  nick: string,
  email: string
): Promise<void> => {
  await connection("Users")
    .insert({
      user_id: Date.now(),
      user_name: name,
      user_nick: nick,
      user_email: email,
    })
    .into("Users");
};

//Creates a new task
export const createTask = async (
  title: string,
  description: string,
  deadline: string,
  creator: string
): Promise<void> => {
  await connection("Tasks")
    .insert({
      task_id: Date.now(),
      task_title: title,
      task_description: description,
      task_deadline: deadline.split("/").reverse().join("-"),
      task_creator: creator,
    })
    .into("Tasks");
};

//Assigns an user to a task
export const assignResponsible = async (
  taskId: string,
  userId: string[]
): Promise<void> => {
  userId.forEach(async (item: string) => {
    await connection("UserAndTask")
      .insert({
        task_id: taskId,
        user_id: item,
      })
      .into("UserAndTask");
  });
};

//Gets all users
export const getUsers = async (): Promise<any> => {
  const users: any = [];
  const result = await connection("Users").select("user_id", "user_nick");
  users.push(result);
  return { users: users.flat(1) };
};

//Searches for an user
export const searchUser = async (query: string): Promise<any> => {
  const result = await connection("Users")
    .select("user_id", "user_nick")
    .where("user_nick", "like", `%${query}%`)
    .orWhere("user_email", "like", `%${query}%`);

  return result;
};

//Gets user by id
export const getUserById = async (id: string): Promise<any> => {
  const response = await connection("Users")
    .select("user_id", "user_nick")
    .where("user_id", id);

  return response[0];
};

//Gets tasks by creator id
export const getTaskByCreatorId = async (id: any): Promise<any> => {
  const tasks = [];

  const result = await connection("Tasks")
    .join("Users", "Users.user_id", "Tasks.task_creator")
    .select(
      "Tasks.task_id",
      "Tasks.task_title",
      "Tasks.task_description",
      "Tasks.task_deadline",
      "Tasks.task_creator",
      "Tasks.task_status",
      "Users.user_nick"
    )
    .where("Tasks.task_creator", id);

  tasks.push(result);

  return { tasks: result.flat(1) };
};

//Searches for a task
export const searchTask = async (query: string): Promise<any> => {
  const result = await connection("Tasks")
    .join("Users", "Users.user_id", "Tasks.task_creator")
    .select(
      "task_id",
      "task_title",
      "task_description",
      "task_deadline",
      "task_creator",
      "Users.user_nick"
    )
    .where("task_title", "like", `%${query}%`)
    .orWhere("task_description", "like", `%${query}%`);

  return result;
};

//Gets tasks by status
export const getTasksByStatus = async (status: string): Promise<any> => {
  let taskStatus = status;
  if (status === "to-do") {
    taskStatus = status.split("-").join(" ");
  }

  const result = await connection("Tasks")
    .join("Users", "Users.user_id", "Tasks.task_creator")
    .select(
      "Tasks.task_id",
      "Tasks.task_title",
      "Tasks.task_description",
      "Tasks.task_deadline",
      "Tasks.task_creator",
      "Users.user_nick"
    )
    .where("Tasks.task_status", taskStatus);

  return result;
};

//Gets delayed tasks
export const getDelayedTasks = async (): Promise<any> => {
  const now = new Date(Date.now());
  const result = await connection("Tasks")
    .join("Users", "Users.user_id", "Tasks.task_creator")
    .select(
      "Tasks.task_id",
      "Tasks.task_title",
      "Tasks.task_description",
      "Tasks.task_deadline",
      "Tasks.task_creator",
      "Users.user_nick"
    )
    .where("Tasks.task_deadline", "<", now);

  return result;
};

//Gets task by id
export const getTaskById = async (id: string): Promise<any> => {
  const response = await connection("Tasks")
    .select(
      "task_id",
      "task_title",
      "task_description",
      "task_status",
      "task_deadline",
      "task_creator"
    )
    .where("task_id", id);

  return response[0];
};

//Gets all responsibles by task
export const getResponsibles = async (id: string): Promise<any> => {
  const responsibles: any = [];

  const result = await connection("Users")
    .join("UserAndTask", "Users.user_id", "UserAndTask.user_id")
    .select("Users.user_id", "Users.user_nick")
    .where("UserAndTask.task_id", id);

  responsibles.push(result);

  return { responsibles: responsibles.flat(1) };
};

//Edits user
export const editUser = async (
  id: string,
  name: string,
  nick: string
): Promise<void> => {
  await connection("Users")
    .update({
      user_name: name,
      user_nick: nick,
    })
    .where("user_id", id);
};

//Edits status
export const editStatus = async (
  id: string[],
  status: string
): Promise<void> => {
  id.forEach(async (item: string) => {
    await connection("Tasks")
      .update("task_status", status)
      .where("task_id", item);
  });
};

//Deletes a task
export const deleteTask = async (id: string): Promise<void> => {
  const responsiblesResult = await getResponsibles(id);
  responsiblesResult.responsibles
    .map((item: any) => {
      return item.user_id;
    })
    .forEach((userId: string) => {
      removeResponsible(id, userId);
    });

  await connection("Tasks").where("task_id", id).del();
};

//Removes responsible
export const removeResponsible = async (
  taskId: string,
  userId: string
): Promise<void> => {
  await connection("UserAndTask")
    .where("user_id", userId)
    .andWhere("task_id", taskId)
    .del();
};

//Deletes an user
export const deleteUser = async (userId: string): Promise<void> => {
  const user = await connection("UserAndTask")
    .where("user_id", userId)
    .select();

  user.forEach(async (item) => {
    removeResponsible(item.task_id, userId);
  });
  await connection("Tasks").where("task_creator", userId).del();
  await connection("Users").where("user_id", userId).del();
};
