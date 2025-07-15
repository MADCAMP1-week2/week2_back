const Project = require("../models/Project");
const asyncHandler = require("../middlewares/asyncHandler");
const { default: mongoose } = require("mongoose");

// 프로젝트 생성
exports.createProject = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const newProject = await Project.create({ ...req.body, owner });
  res.status(201).json(newProject);
});

// 자기가 참여한 프로젝트 목록 조회
exports.getMyProjects = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const projects = await Project.find({
    members: { $in: [new mongoose.Types.ObjectId(userId)] },
  })
    .select("name description owner isActive createdAt")
    .lean();
  res.status(200).json(projects);
});

// 프로젝트 수정 (name, description, isActive) (해당 프로젝트의 오너만 수정 가능)
exports.updateProjectInfo = asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.userId; // 현재 사용자
  const { name, description, isActive } = req.body;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (isActive !== undefined) updateFields.isActive = isActive;

  // 오너 확인과 동시에 업데이트
  const updatedProject = await Project.findOneAndUpdate(
    { _id: projectId, owner: userId },
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("name description isActive");

  if (!updatedProject) {
    return res
      .status(403)
      .json({ message: "프로젝트가 없거나 수정 권한이 없습니다." });
  }

  res.status(200).json(updatedProject);
});

// 프로젝트 멤버 수정 (해당 프로젝트의 멤버만 멤버 수정 가능)
// PATCH /api/projects/:id/members
exports.updateProjectMembers = asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const { members } = req.body;

  // 유효성 검사: members는 배열이어야 함
  if (!Array.isArray(members)) {
    return res.status(400).json({ message: "members는 배열이어야 합니다." });
  }

  // 프로젝트 먼저 조회
  const project = await Project.findById(projectId).lean();
  if (!project) {
    return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
  }

  const ownerId = project.owner.toString();
  const userId = req.user.userId; // 현재 사용자

  // 현재 사용자가 프로젝트 멤버가 아닐 경우
  const isMember = project.members.map((id) => id.toString()).includes(userId);

  if (!isMember) {
    return res
      .status(403)
      .json({ message: "해당 프로젝트의 멤버만 수정할 수 있습니다." });
  }

  // 중복 없이 members 배열 만들기
  const updatedMembers = [
    ...new Set([...members.map((id) => id.toString()), ownerId]),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const updatedProject = await Project.findByIdAndUpdate(
    projectId,
    { members: updatedMembers },
    { new: true }
  ).select("name members");

  res.status(200).json(updatedProject);
});

// 프로젝트 오너 수정 (해당 프로젝트의 오너만 변경 가능)
// { "newOwnerId":"어쩌구" }
exports.updateProjectOwner = asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const { newOwnerId } = req.body;
  const userId = req.user.userId; // 현재 사용자

  // 유효성 검사
  if (!newOwnerId) {
    return res.status(400).json({ message: "newOwnerId가 필요합니다." });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
  }

  // 요청자가 오너인지 확인
  if (project.owner.toString() !== userId) {
    return res
      .status(403)
      .json({ message: "오너만 프로젝트 오너를 변경할 수 있습니다." });
  }

  // 새로운 오너가 멤버인지 확인
  const isMember = project.members
    .map((id) => id.toString())
    .includes(newOwnerId);
  if (!isMember) {
    return res.status(400).json({
      message: "새로운 오너는 프로젝트 멤버 중에 존재해야 합니다.",
    });
  }

  // 오너 변경
  project.owner = newOwnerId;
  await project.save();

  res.status(200).json({
    message: "프로젝트 오너가 변경되었습니다.",
    project: {
      id: project._id,
      name: project.name,
      owner: project.owner,
      members: project.members,
    },
  });
});

// 프로젝트 삭제 (해당 프로젝트의 오너만 삭제 가능)
exports.deleteProject = asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.userId; // 현재 사용자

  // 오너만 삭제 가능하도록 조건 포함
  const deletedProject = await Project.findOneAndDelete({
    _id: projectId,
    owner: userId,
  });

  if (!deletedProject) {
    return res
      .status(403)
      .json({ message: "프로젝트가 없거나 삭제 권한이 없습니다." });
  }

  res.status(204).end();
});
