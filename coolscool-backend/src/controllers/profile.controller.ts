import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import * as profileModel from '../models/profile.model.js';

const updateProfileSchema = Joi.object({
  firstName: Joi.string().max(100).allow('', null),
  lastName: Joi.string().max(100).allow('', null),
  phoneNumber: Joi.string().max(20).allow('', null),
  dateOfBirth: Joi.date().iso().max('now').allow(null),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').allow(null),
  grade: Joi.number().integer().min(1).max(12).allow(null),
  schoolName: Joi.string().max(255).allow('', null),
  city: Joi.string().max(100).allow('', null),
  state: Joi.string().max(100).allow('', null),
  bio: Joi.string().max(500).allow('', null),
  parentGuardianName: Joi.string().max(200).allow('', null),
  parentGuardianPhone: Joi.string().max(20).allow('', null),
  parentGuardianEmail: Joi.string().email().max(255).allow('', null),
  parentGuardianRelationship: Joi.string().valid('father', 'mother', 'guardian', 'other').allow(null),
  preferredLanguage: Joi.string().max(50).allow('', null),
  learningStyle: Joi.string().valid('visual', 'auditory', 'reading', 'kinesthetic').allow(null),
  subjectsOfInterest: Joi.array().items(Joi.string()).max(10).allow(null),
}).min(1);

// GET /profile - Get authenticated user's profile
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const profile = await profileModel.getProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

// PUT /profile - Update authenticated user's profile
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile data',
          details: error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        },
      });
      return;
    }

    // Convert camelCase request body to snake_case for the model
    const updateFields: profileModel.UpdateProfileInput = {};

    if (value.firstName !== undefined) updateFields.first_name = value.firstName;
    if (value.lastName !== undefined) updateFields.last_name = value.lastName;
    if (value.phoneNumber !== undefined) updateFields.phone_number = value.phoneNumber;
    if (value.dateOfBirth !== undefined) updateFields.date_of_birth = value.dateOfBirth;
    if (value.gender !== undefined) updateFields.gender = value.gender;
    if (value.grade !== undefined) updateFields.grade = value.grade;
    if (value.schoolName !== undefined) updateFields.school_name = value.schoolName;
    if (value.city !== undefined) updateFields.city = value.city;
    if (value.state !== undefined) updateFields.state = value.state;
    if (value.bio !== undefined) updateFields.bio = value.bio;
    if (value.parentGuardianName !== undefined) updateFields.parent_guardian_name = value.parentGuardianName;
    if (value.parentGuardianPhone !== undefined) updateFields.parent_guardian_phone = value.parentGuardianPhone;
    if (value.parentGuardianEmail !== undefined) updateFields.parent_guardian_email = value.parentGuardianEmail;
    if (value.parentGuardianRelationship !== undefined) updateFields.parent_guardian_relationship = value.parentGuardianRelationship;
    if (value.preferredLanguage !== undefined) updateFields.preferred_language = value.preferredLanguage;
    if (value.learningStyle !== undefined) updateFields.learning_style = value.learningStyle;
    if (value.subjectsOfInterest !== undefined) updateFields.subjects_of_interest = value.subjectsOfInterest;

    const profile = await profileModel.updateProfile(userId, updateFields);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}
